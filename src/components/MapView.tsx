"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SENTIDO_KM_ABREV, SENTIDO_PISTA_LABELS, CATEGORIA_SINISTRO_LABELS, NIVEL_RISCO_LABELS, TIPO_COMERCIO_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { PontoApoio, PontoRisco, RiscoInformado, PontoComercial } from "@/types/database";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// Centro aproximado da Rodovia Presidente Dutra próximo a Aparecida-SP
const DEFAULT_CENTER: [number, number] = [-45.2317, -22.8494];

export interface PeregrinoAtivo {
  user_id: string;
  latitude: number;
  longitude: number;
}

export interface PontoTrajeto {
  ordem: number;
  cidade: string;
  lat: number;
  lng: number;
  feito: boolean;
}

// Uma rota inteira (Norte ou Sul), para destacar no mapa geral com uma cor
// clara própria — diferente do trajeto pessoal do peregrino (tracejado
// marrom) e sem marcadores numerados, só a linha.
export interface RotaLinha {
  nome: string;
  cor: string;
  pontos: { lat: number; lng: number; ordem: number }[];
}

// PAP que ainda não foi vinculado por nenhum gerente — mostrado no mapa com
// a localização aproximada (cidade) só como referência, já que o
// pré-cadastro não tem coordenadas exatas. Some da lista assim que um
// gerente vincula (ver reivindicado_por), dando lugar ao PAP real (com
// aprovação e localização exata) quando publicado.
export interface PapPreCadastroMapa {
  id: string;
  nome: string;
  cidade: string;
  br: string;
  km: number | null;
  sentido_pista: string | null;
  lat: number;
  lng: number;
  // Calendário de datas ativas (Rodada 18) — mesmo tratamento já dado aos
  // PAP já vinculados (ver ativoHoje abaixo): sem data marcada, ou fora do
  // período marcado, o popup avisa que está fora do funcionamento hoje.
  datas_funcionamento?: string[];
}

interface Props {
  pontosApoio?: PontoApoio[];
  pontosRisco?: PontoRisco[];
  avisos?: RiscoInformado[];
  peregrinos?: PeregrinoAtivo[];
  trajeto?: PontoTrajeto[];
  rotasLinhas?: RotaLinha[];
  papsPreCadastro?: PapPreCadastroMapa[];
  // Hotéis e Restaurantes (Rodada 21)
  pontosComerciais?: PontoComercial[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  markerPreview?: { lat: number; lng: number } | null;
  calorPeregrinos?: boolean;
  minhaPosicao?: { lat: number; lng: number } | null;
  // Só true para administradores logados: deixa os marcadores de PAP
  // pré-cadastro (tenda cinza tracejada) arrastáveis direto no mapa
  // público, salvando a posição exata assim que soltos — sem precisar
  // abrir a tela separada de reposicionar (RLS já restringe esse update a
  // admin, ver paps_pre_cadastro_update_admin).
  permitirArrastarPapPreCadastro?: boolean;
}

function servicosLabel(servicos: string[]) {
  return servicos.length ? servicos.join(", ") : "—";
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Um PAP só conta como ativo hoje se tiver datas marcadas e a data atual
// estiver entre elas. Sem nenhuma data marcada, nunca aparece como ativo.
function ativoHoje(datas: string[] | undefined) {
  if (!datas || datas.length === 0) return false;
  return datas.includes(hojeISO());
}

function kmSentidoLabel(km: number | null | undefined, sentido: string | null | undefined) {
  if (km == null) return null;
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

export default function MapView({
  pontosApoio = [],
  pontosRisco = [],
  avisos = [],
  peregrinos = [],
  trajeto = [],
  rotasLinhas = [],
  papsPreCadastro = [],
  pontosComerciais = [],
  center = DEFAULT_CENTER,
  zoom = 9,
  height = "500px",
  pickMode = false,
  onPick,
  markerPreview = null,
  calorPeregrinos = false,
  minhaPosicao = null,
  permitirArrastarPapPreCadastro = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const trajetoMarkersRef = useRef<Marker[]>([]);
  const previewMarkerRef = useRef<Marker | null>(null);
  const minhaPosicaoMarkerRef = useRef<Marker | null>(null);
  const rotasLayerIdsRef = useRef<string[]>([]);

  // Cria o mapa uma única vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center,
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    if (pickMode) {
      map.on("click", (e: MapMouseEvent) => {
        onPick?.(e.lngLat.lat, e.lngLat.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores de pontos de apoio + risco + peregrinos
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pontosApoio.forEach((p) => {
      // PAP marcado com uma barraca (tenda) verde — mais fácil de
      // reconhecer de relance no mapa do que o antigo losango marrom.
      const el = document.createElement("div");
      el.style.cssText =
        "width:30px;height:30px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center";
      el.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.5 21 14 3"/>
          <path d="M20.5 21 10 3"/>
          <path d="M15.5 21 12 15l-3.5 6"/>
          <path d="M2 21h20"/>
        </svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(
          // Conteúdo do popup simplificado na Rodada 20, a pedido do
          // usuário: uma informação por linha, sempre nesta ordem — foto (se
          // houver), nome, telefone (se autorizado a exibir), cidade, km e
          // sentido, horário de funcionamento, serviços e, por último, se
          // aceita doações (e quais). Linhas sem dado disponível não
          // aparecem, em vez de mostrar "—".
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              ${p.foto_url ? `<img src="${p.foto_url}" alt="Foto do PAP" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
              <strong>${p.nome}</strong><br/>
              ${p.telefone && p.exibir_telefone !== false ? `Telefone: ${p.telefone}<br/>` : ""}
              ${p.cidade ? `Cidade: ${p.cidade}<br/>` : ""}
              ${kmSentidoLabel(p.km_referencia, p.sentido_pista) ? `${kmSentidoLabel(p.km_referencia, p.sentido_pista)}<br/>` : ""}
              ${p.periodo_funcionamento ? `Horário: ${p.periodo_funcionamento}<br/>` : ""}
              Serviços: ${servicosLabel(p.servicos)}<br/>
              ${
                p.aceita_doacoes
                  ? `<span style="color:#92400e;font-weight:600">Aceita doações: ${p.doacao_necessidade || "não especificado o quê"}</span>`
                  : ""
              }
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    pontosRisco.forEach((r) => {
      // Bandeira vermelha para risco alto/muito alto (4-5), amarela para
      // moderado (3) — só existem esses 3 níveis (ver NIVEL_RISCO_LABELS).
      const alto = r.nivel_risco >= 4;
      const cor = alto ? "#dc2626" : "#eab308";
      const el = document.createElement("div");
      el.style.cssText = "width:26px;height:26px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))";
      el.innerHTML = `
        <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <line x1="5" y1="2" x2="5" y2="22" stroke="#3f3f3f" stroke-width="2" stroke-linecap="round"/>
          <path d="M5 3 L21 7.5 L5 12 Z" fill="${cor}" stroke="#3f3f3f" stroke-width="1"/>
        </svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([r.longitude, r.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              ${r.foto_url ? `<img src="${r.foto_url}" alt="Foto do local de risco" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
              <strong style="color:${cor}">🚩 ${r.titulo}</strong><br/>
              ${kmSentidoLabel(r.km_referencia, r.sentido) ? `${kmSentidoLabel(r.km_referencia, r.sentido)}<br/>` : ""}
              ${r.descricao ?? ""}<br/>
              Nível de risco: ${NIVEL_RISCO_LABELS[r.nivel_risco] ?? r.nivel_risco}
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    avisos.forEach((a) => {
      // Avisos de peregrinos (sinistro/suspeita/chuva) — cor laranja para
      // diferenciar dos pontos de risco curados pela administração
      // (vermelho/amarelo). Confirmados pela administração ganham uma borda
      // verde; os demais (publicados automaticamente) mostram "não
      // confirmado" no popup.
      const confirmado = a.status === "aprovado";
      const el = document.createElement("div");
      el.style.cssText = `width:26px;height:26px;border-radius:50%;background:#ea580c;border:2px solid ${
        confirmado ? "#16a34a" : "white"
      };box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center`;
      el.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
          <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>
          <path d="M8 6v8"/>
        </svg>`;
      const minutos = Math.max(0, Math.round((Date.now() - new Date(a.criado_em).getTime()) / 60000));
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([a.longitude, a.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              <span style="font-size:10px;letter-spacing:.05em;color:#ea580c;font-weight:700">${
                CATEGORIA_SINISTRO_LABELS[a.categoria] ?? a.categoria
              } — ${confirmado ? "CONFIRMADO" : "NÃO CONFIRMADO"}</span><br/>
              <strong>${a.titulo}</strong><br/>
              ${a.descricao ? `${a.descricao}<br/>` : ""}
              Informado há ${minutos} min
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    peregrinos.forEach((p) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(
            '<span style="color:#1f1f1f">Peregrino em caminhada</span>'
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    papsPreCadastro.forEach((p) => {
      // Tenda cinza/tracejada (em vez do verde sólido do PAP confirmado) —
      // deixa claro que é uma localização aproximada (pela cidade), ainda
      // sem gerente vinculado.
      const el = document.createElement("div");
      el.style.cssText =
        "width:28px;height:28px;border-radius:50%;background:#a3a3a3;border:2px dashed white;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:.85";
      el.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.5 21 14 3"/>
          <path d="M20.5 21 10 3"/>
          <path d="M15.5 21 12 15l-3.5 6"/>
          <path d="M2 21h20"/>
        </svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "center", draggable: permitirArrastarPapPreCadastro })
        .setLngLat([p.lng, p.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              <span style="font-size:10px;letter-spacing:.05em;color:#737373;font-weight:700">PAP AGUARDANDO VÍNCULO</span><br/>
              <strong>${p.nome}</strong><br/>
              ${p.cidade}${p.km != null ? ` — km ${p.km}` : ""}${
                p.sentido_pista ? ` (${SENTIDO_PISTA_LABELS[p.sentido_pista] ?? p.sentido_pista})` : ""
              }<br/>
              <span style="color:#737373">Localização estimada pelo km da rodovia — ainda sem gerente vinculado. Assim que um gerente vincular e a administração aprovar, este ponto passa a ser um PAP com localização exata.</span>
              ${
                !ativoHoje(p.datas_funcionamento)
                  ? `<br/><span style="color:#dc2626;font-weight:600">Fora do período de funcionamento hoje</span>`
                  : `<br/><span style="color:#16a34a;font-weight:600">Ativo hoje</span>`
              }
              ${
                permitirArrastarPapPreCadastro
                  ? `<br/><span style="color:#92400e;font-weight:600">Arraste o marcador para ajustar a posição exata.</span>`
                  : ""
              }
            </div>
          `)
        )
        .addTo(map);

      if (permitirArrastarPapPreCadastro) {
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLngLat();
          const supabase = createClient();
          supabase
            .from("paps_pre_cadastro")
            .update({ latitude: lat, longitude: lng })
            .eq("id", p.id)
            .then(({ error }) => {
              if (error) {
                console.error("Não foi possível salvar a nova posição do PAP pré-cadastro:", error);
                marker.setLngLat([p.lng, p.lat]);
              }
            });
        });
      }

      markersRef.current.push(marker);
    });

    pontosComerciais.forEach((c) => {
      // Hotéis (azul, cama) e restaurantes (violeta, talheres) — cores e
      // ícones diferentes dos usados por PAP/risco/avisos/pré-cadastro, para
      // não se confundirem no mapa.
      const hotel = c.tipo === "hotel";
      const cor = hotel ? "#2563eb" : "#7c3aed";
      const el = document.createElement("div");
      el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${cor};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center`;
      el.innerHTML = hotel
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.longitude, c.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              ${c.foto_url ? `<img src="${c.foto_url}" alt="Foto de ${c.nome}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
              <span style="font-size:10px;letter-spacing:.05em;color:${cor};font-weight:700">${TIPO_COMERCIO_LABELS[c.tipo] ?? c.tipo}</span><br/>
              <strong>${c.nome}</strong><br/>
              ${c.telefone && c.exibir_telefone !== false ? `Telefone: ${c.telefone}<br/>` : ""}
              ${c.cidade ? `Cidade: ${c.cidade}<br/>` : ""}
              ${kmSentidoLabel(c.km_referencia, c.sentido_pista) ? `${kmSentidoLabel(c.km_referencia, c.sentido_pista)}<br/>` : ""}
              ${c.ponto_referencia ? `${c.ponto_referencia}<br/>` : ""}
              ${c.descricao ? `${c.descricao}` : ""}
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [pontosApoio, pontosRisco, avisos, peregrinos, papsPreCadastro, pontosComerciais, permitirArrastarPapPreCadastro]);

  // Trajeto — linha ligando os pontos de check-in da rota, destacando os
  // já concluídos (verde) dos pendentes (âmbar)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function desenhar() {
      trajetoMarkersRef.current.forEach((m) => m.remove());
      trajetoMarkersRef.current = [];

      if (trajeto.length === 0) {
        if (map!.getLayer("trajeto-linha")) map!.removeLayer("trajeto-linha");
        if (map!.getSource("trajeto-linha")) map!.removeSource("trajeto-linha");
        return;
      }

      const ordenado = [...trajeto].sort((a, b) => a.ordem - b.ordem);
      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: ordenado.map((p) => [p.lng, p.lat]),
        },
      };

      const source = map!.getSource("trajeto-linha") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map!.addSource("trajeto-linha", { type: "geojson", data: geojson });
        map!.addLayer({
          id: "trajeto-linha",
          type: "line",
          source: "trajeto-linha",
          paint: {
            "line-color": "#92400e",
            "line-width": 3,
            "line-dasharray": [2, 1.5],
          },
        });
      }

      ordenado.forEach((p) => {
        const el = document.createElement("div");
        const cor = p.feito ? "#16a34a" : "#d97706";
        el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${cor};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700`;
        el.textContent = String(p.ordem);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font-family:sans-serif"><strong>${p.ordem}. ${p.cidade}</strong><br/>${
                p.feito ? "Check-in feito ✓" : "Pendente"
              }</div>`
            )
          )
          .addTo(map!);
        trajetoMarkersRef.current.push(marker);
      });

      if (ordenado.length > 1) {
        const lons = ordenado.map((p) => p.lng);
        const lats = ordenado.map((p) => p.lat);
        map!.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 40, maxZoom: 10 }
        );
      }
    }

    if (map.isStyleLoaded()) {
      desenhar();
    } else {
      map.once("load", desenhar);
    }
  }, [trajeto]);

  // Rotas Norte/Sul destacadas no mapa geral — uma linha clara por rota, a
  // partir dos pontos de check-in de cada uma, para deixar claro qual
  // trecho da rodovia corresponde a cada rota de peregrinação.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function limpar() {
      rotasLayerIdsRef.current.forEach((id) => {
        if (map!.getLayer(id)) map!.removeLayer(id);
        if (map!.getSource(id)) map!.removeSource(id);
      });
      rotasLayerIdsRef.current = [];
    }

    function desenhar() {
      limpar();
      rotasLinhas.forEach((rota, i) => {
        const ordenado = [...rota.pontos].sort((a, b) => a.ordem - b.ordem);
        if (ordenado.length < 2) return;
        const id = `rota-linha-${i}`;
        const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: { nome: rota.nome },
          geometry: {
            type: "LineString",
            coordinates: ordenado.map((p) => [p.lng, p.lat]),
          },
        };
        map!.addSource(id, { type: "geojson", data: geojson });
        map!.addLayer(
          {
            id,
            type: "line",
            source: id,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": rota.cor,
              "line-width": 6,
              "line-opacity": 0.75,
            },
          },
          // Insere abaixo dos marcadores (que são elementos HTML, não
          // layers) mas isso não importa aqui — só cuidamos de não cobrir
          // a camada base do mapa.
          undefined
        );
        rotasLayerIdsRef.current.push(id);
      });
    }

    if (map.isStyleLoaded()) {
      desenhar();
    } else {
      map.once("load", desenhar);
    }

    return () => limpar();
  }, [rotasLinhas]);

  // Mapa de calor de peregrinos ativos — intensidade conforme a
  // concentração de peregrinos naquele ponto do trajeto (uso administrativo).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function desenharCalor() {
      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: peregrinos.map((p) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        })),
      };

      const source = map!.getSource("peregrinos-calor") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
        return;
      }
      if (!calorPeregrinos) return;

      map!.addSource("peregrinos-calor", { type: "geojson", data: geojson });
      map!.addLayer({
        id: "peregrinos-calor-layer",
        type: "heatmap",
        source: "peregrinos-calor",
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": 1.2,
          "heatmap-radius": 35,
          "heatmap-opacity": 0.65,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "rgb(254,240,217)",
            0.4,
            "rgb(253,204,138)",
            0.6,
            "rgb(252,141,89)",
            0.8,
            "rgb(227,74,51)",
            1,
            "rgb(153,0,0)",
          ],
        },
      });
    }

    if (!calorPeregrinos) return;
    if (map.isStyleLoaded()) {
      desenharCalor();
    } else {
      map.once("load", desenharCalor);
    }
  }, [peregrinos, calorPeregrinos]);

  // Marcador da posição atual do próprio peregrino (na página de trajeto)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (minhaPosicaoMarkerRef.current) {
      minhaPosicaoMarkerRef.current.remove();
      minhaPosicaoMarkerRef.current = null;
    }
    if (minhaPosicao) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,.3)";
      minhaPosicaoMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([minhaPosicao.lng, minhaPosicao.lat])
        .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML("Você está aqui"))
        .addTo(map);
    }
  }, [minhaPosicao]);

  // Marcador de prévia (ao cadastrar novo ponto)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
    if (markerPreview) {
      previewMarkerRef.current = new maplibregl.Marker({ color: "#16a34a" })
        .setLngLat([markerPreview.lng, markerPreview.lat])
        .addTo(map);
      map.flyTo({ center: [markerPreview.lng, markerPreview.lat], zoom: Math.max(map.getZoom(), 13) });
    }
  }, [markerPreview]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden" }}
    />
  );
}
