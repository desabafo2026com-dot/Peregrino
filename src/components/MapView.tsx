"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  SENTIDO_KM_ABREV,
  SENTIDO_PISTA_LABELS,
  CATEGORIA_SINISTRO_LABELS,
  NIVEL_RISCO_LABELS,
  TIPO_COMERCIO_LABELS,
  SERVICOS_PONTO_APOIO,
  formatarDatasFuncionamento,
} from "@/lib/constants";
import { comDesvioMinimoPap } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";
import type { PontoApoio, PontoRisco, RiscoInformado, PontoComercial } from "@/types/database";
import { LIMITE_NAO_EXISTE, type ResultadoVotoAviso, type TipoVotoAviso } from "@/lib/avisos-votos";

// Texto vindo de peregrinos (avisos) vai para dentro de HTML do balão —
// escapado para não virar marcação.
function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Rodada 59 (revisão de segurança) — TODO texto que vai para dentro do
// HTML dos balões passa por aqui (nome de PAP, cidade, descrição... são
// digitados por gerentes/peregrinos e não podem virar código na página).
function e(valor: unknown): string {
  if (valor == null) return "";
  return escaparHtml(String(valor));
}

// Foto só de endereço http(s) ou do próprio site — nada de "javascript:".
function urlSegura(valor: string | null | undefined): string {
  if (!valor) return "";
  const v = valor.trim();
  return /^https?:\/\//i.test(v) || (v.startsWith("/") && !v.startsWith("//")) ? escaparHtml(v) : "";
}

function textoConfirmacoes(n: number) {
  return n === 1 ? "Confirmado por 1 peregrino" : `Confirmado por ${n} peregrinos`;
}

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
  // Rodada 46 — posição do check-in na sequência em que o peregrino fez
  // (1º, 2º, 3º...). Só os já feitos têm número no mapa; os pendentes
  // aparecem como um ponto simples, sem numeração.
  sequencia?: number | null;
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
  // Rodada 42 — só /mapa usa: marcadores de PAP maiores, com borda mais
  // grossa, para ficarem bem visíveis quando o mapa mostra só PAP.
  papDestacado?: boolean;
  // Rodada 42 — ao mudar, o mapa voa até esse PAP e abre o popup dele
  // (usado pela busca abaixo do mapa em /mapa). `chave` é "pap:<id>" para
  // PAP confirmado ou "pre:<id>" para PAP do pré-cadastro; `seq` muda a
  // cada clique, para o mesmo PAP poder ser escolhido de novo.
  focoPap?: { chave: string; seq: number } | null;
  // Rodada 43 — só para administradores: o popup do PAP ganha um link
  // "Editar este PAP", que abre a edição pela administração.
  linkEditarPapAdmin?: boolean;
  // Rodada 47 — quando presente (mapa de "Minha peregrinação"), o balão de
  // cada aviso ganha os botões "Ainda está lá" / "Já não existe".
  onVotarAviso?: (avisoId: string, tipo: TipoVotoAviso) => Promise<ResultadoVotoAviso | { erro: string }>;
}

function servicosLabel(servicos: string[]) {
  if (!servicos.length) return "—";
  const labelPorValor = new Map(SERVICOS_PONTO_APOIO.map((s) => [s.value, s.label]));
  return servicos.map((s) => labelPorValor.get(s) ?? s).join(", ");
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
  papDestacado = false,
  focoPap = null,
  linkEditarPapAdmin = false,
  onVotarAviso,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const papMarkersRef = useRef<Map<string, Marker>>(new Map());
  const trajetoMarkersRef = useRef<Marker[]>([]);
  const trajetoEnquadradoRef = useRef(false);
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
    papMarkersRef.current = new Map();

    // Rodada 42 — tamanhos maiores quando papDestacado (só em /mapa).
    const tamPap = papDestacado ? 40 : 30;
    const iconePap = papDestacado ? 22 : 17;
    const bordaPap = papDestacado ? 3 : 2;
    const tamPre = papDestacado ? 36 : 28;
    const iconePre = papDestacado ? 19 : 15;

    // Rodada 24: pequeno desvio determinístico só para PAP cujas
    // coordenadas caem praticamente coincidentes com outro (ver
    // comDesvioMinimoPap em lib/geo.ts) — evita dois marcadores aprovados
    // se sobreporem exatamente e parecerem um só no mapa.
    const posicoesPap = comDesvioMinimoPap(pontosApoio);

    pontosApoio.forEach((p) => {
      const posicao = posicoesPap.get(p.id) ?? { lat: p.latitude, lng: p.longitude };
      // PAP marcado com uma barraca (tenda) verde — mais fácil de
      // reconhecer de relance no mapa do que o antigo losango marrom.
      const el = document.createElement("div");
      el.style.cssText = `width:${tamPap}px;height:${tamPap}px;border-radius:50%;background:#16a34a;border:${bordaPap}px solid white;box-shadow:0 ${
        papDestacado ? "2px 6px rgba(0,0,0,.55)" : "1px 3px rgba(0,0,0,.4)"
      };display:flex;align-items:center;justify-content:center;cursor:pointer${papDestacado ? ";z-index:2" : ""}`;
      el.setAttribute("aria-label", `PAP ${p.nome}`);
      el.innerHTML = `
        <svg width="${iconePap}" height="${iconePap}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.5 21 14 3"/>
          <path d="M20.5 21 10 3"/>
          <path d="M15.5 21 12 15l-3.5 6"/>
          <path d="M2 21h20"/>
        </svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([posicao.lng, posicao.lat])
        .setPopup(
          // Conteúdo do popup — uma informação por linha. Rodada 33, a
          // pedido do usuário ("ser mais simples"): foto, nome, cidade/km/
          // sentido, dias de funcionamento, horário e o que oferece, nessa
          // ordem; telefone/responsável/doações continuam abaixo, para quem
          // precisar. Linhas sem dado disponível não aparecem, em vez de
          // mostrar "—".
          new maplibregl.Popup({ offset: papDestacado ? 24 : 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              ${urlSegura(p.foto_url) ? `<img src="${urlSegura(p.foto_url)}" alt="Foto do PAP" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
              <strong>${e(p.nome)}</strong><br/>
              ${p.cidade ? `Cidade: ${e(p.cidade)}<br/>` : ""}
              ${kmSentidoLabel(p.km_referencia, p.sentido_pista) ? `${kmSentidoLabel(p.km_referencia, p.sentido_pista)}<br/>` : ""}
              Dias de funcionamento: ${formatarDatasFuncionamento(p.datas_funcionamento)}${
                ativoHoje(p.datas_funcionamento)
                  ? ` <span style="color:#16a34a;font-weight:600">(ativo hoje)</span>`
                  : ""
              }<br/>
              ${p.periodo_funcionamento ? `Horário: ${e(p.periodo_funcionamento)}<br/>` : ""}
              O que oferece: ${e(servicosLabel(p.servicos))}<br/>
              ${
                p.aceita_doacoes
                  ? `<span style="color:#92400e;font-weight:600">Aceita doações: ${e(p.doacao_necessidade || "não especificado o quê")}</span><br/>`
                  : ""
              }
              ${p.responsavel && p.exibir_telefone !== false ? `Responsável: ${e(p.responsavel)}<br/>` : ""}
              ${p.telefone && p.exibir_telefone !== false ? `Telefone: ${e(p.telefone)}` : ""}
              ${
                linkEditarPapAdmin
                  ? `<a href="/admin/pap/${encodeURIComponent(p.id)}/editar" style="display:inline-block;margin-top:8px;color:#8f3f19;font-weight:700;text-decoration:underline">Editar este PAP (administração)</a>`
                  : ""
              }
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
      papMarkersRef.current.set(`pap:${p.id}`, marker);
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
              ${urlSegura(r.foto_url) ? `<img src="${urlSegura(r.foto_url)}" alt="Foto do local de risco" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
              <strong style="color:${cor}">🚩 ${e(r.titulo)}</strong><br/>
              ${kmSentidoLabel(r.km_referencia, r.sentido) ? `${e(kmSentidoLabel(r.km_referencia, r.sentido))}<br/>` : ""}
              ${e(r.descricao)}<br/>
              Nível de risco: ${e(NIVEL_RISCO_LABELS[r.nivel_risco] ?? r.nivel_risco)}
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

      // Rodada 47 — mostrador de confirmações: bolinha verde com o número
      // em cima do marcador, e a mesma contagem no alto do balão.
      el.style.position = "relative";
      const selo = document.createElement("span");
      selo.style.cssText =
        "position:absolute;top:-9px;right:-9px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#16a34a;color:white;font:700 10px/17px sans-serif;text-align:center;border:1.5px solid white;box-sizing:border-box";
      function atualizarSelo(n: number) {
        selo.textContent = String(n);
        selo.style.display = n > 0 ? "block" : "none";
      }
      atualizarSelo(a.confirmacoes ?? 0);
      el.appendChild(selo);

      const conteudo = document.createElement("div");
      conteudo.style.cssText = "font-family:sans-serif;max-width:230px;color:#1f1f1f";
      conteudo.innerHTML = `
        <div data-contador style="display:${(a.confirmacoes ?? 0) > 0 ? "inline-block" : "none"};margin-bottom:4px;padding:2px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:700"></div>
        <div style="font-size:10px;letter-spacing:.05em;color:#ea580c;font-weight:700">${escaparHtml(
          CATEGORIA_SINISTRO_LABELS[a.categoria] ?? a.categoria
        )} — ${confirmado ? "CONFIRMADO PELA ADMINISTRAÇÃO" : "NÃO CONFIRMADO PELA ADMINISTRAÇÃO"}</div>
        <strong>${escaparHtml(a.titulo)}</strong><br/>
        ${a.descricao ? `${escaparHtml(a.descricao)}<br/>` : ""}
        <span style="color:#666;font-size:12px">Informado há ${minutos} min</span>
        ${
          onVotarAviso
            ? `<div style="margin-top:8px;font-size:12px;font-weight:600">Você está passando por aqui?</div>
               <div style="display:flex;gap:6px;margin-top:4px">
                 <button type="button" data-voto="confirma" style="flex:1;padding:7px 4px;border-radius:8px;border:none;background:#16a34a;color:white;font-weight:700;font-size:12px;cursor:pointer">Ainda está lá</button>
                 <button type="button" data-voto="nao_existe" style="flex:1;padding:7px 4px;border-radius:8px;border:1px solid #d4d4d4;background:white;color:#404040;font-weight:700;font-size:12px;cursor:pointer">Já não existe</button>
               </div>
               <div data-status style="margin-top:6px;font-size:11px;color:#525252"></div>`
            : ""
        }
      `;
      const contador = conteudo.querySelector<HTMLElement>("[data-contador]")!;
      contador.textContent = textoConfirmacoes(a.confirmacoes ?? 0);

      // Balão sempre acima do aviso, e o mapa desliza para ele caber
      // inteiro na tela (com os botões, fica mais alto que os outros).
      const popupAviso = new maplibregl.Popup({ offset: 20, anchor: "bottom", maxWidth: "250px" }).setDOMContent(conteudo);
      popupAviso.on("open", () => {
        map.easeTo({ center: [a.longitude, a.latitude], offset: [0, onVotarAviso ? 140 : 90], duration: 400 });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([a.longitude, a.latitude])
        .setPopup(popupAviso)
        .addTo(map);
      markersRef.current.push(marker);

      if (onVotarAviso) {
        const status = conteudo.querySelector<HTMLElement>("[data-status]")!;
        const botoes = Array.from(conteudo.querySelectorAll<HTMLButtonElement>("button[data-voto]"));
        botoes.forEach((botao) => {
          botao.addEventListener("click", async () => {
            const tipo = botao.dataset.voto as TipoVotoAviso;
            botoes.forEach((b) => (b.disabled = true));
            status.style.color = "#525252";
            status.textContent = "Enviando...";
            const r = await onVotarAviso(a.id, tipo);
            botoes.forEach((b) => (b.disabled = false));
            if ("erro" in r) {
              status.style.color = "#dc2626";
              status.textContent = r.erro;
              return;
            }
            atualizarSelo(r.confirmacoes);
            contador.textContent = textoConfirmacoes(r.confirmacoes);
            contador.style.display = r.confirmacoes > 0 ? "inline-block" : "none";
            if (r.removido) {
              status.style.color = "#166534";
              status.textContent = `Obrigado! ${LIMITE_NAO_EXISTE} peregrinos informaram que já não existe — o aviso saiu do mapa.`;
              botoes.forEach((b) => (b.disabled = true));
              window.setTimeout(() => marker.remove(), 2500);
              return;
            }
            status.style.color = "#166534";
            status.textContent = r.ja_tinha_votado
              ? "Você já tinha respondido este aviso."
              : tipo === "confirma"
                ? "Obrigado por confirmar!"
                : `Obrigado! Já não existe: ${r.nao_existe} de ${LIMITE_NAO_EXISTE} para sair do mapa.`;
          });
        });
      }
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
      el.style.cssText = `width:${tamPre}px;height:${tamPre}px;border-radius:50%;background:${
        papDestacado ? "#8a8a8a" : "#a3a3a3"
      };border:2px dashed white;box-shadow:0 ${
        papDestacado ? "2px 5px rgba(0,0,0,.45)" : "1px 3px rgba(0,0,0,.4)"
      };display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:${papDestacado ? "1" : ".85"}`;
      el.setAttribute("aria-label", `PAP ${p.nome} (aguardando vínculo)`);
      el.innerHTML = `
        <svg width="${iconePre}" height="${iconePre}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.5 21 14 3"/>
          <path d="M20.5 21 10 3"/>
          <path d="M15.5 21 12 15l-3.5 6"/>
          <path d="M2 21h20"/>
        </svg>`;
      const marker = new maplibregl.Marker({ element: el, anchor: "center", draggable: permitirArrastarPapPreCadastro })
        .setLngLat([p.lng, p.lat])
        .setPopup(
          // Rodada 33, a pedido do usuário: tirado o parágrafo explicativo
          // longo sobre localização estimada/sem gerente vinculado — a
          // etiqueta "PAP AGUARDANDO VÍNCULO" já comunica isso de forma
          // simples. Adicionados os dias de funcionamento por extenso (antes
          // só aparecia o status "ativo hoje"/"fora do período").
          new maplibregl.Popup({ offset: papDestacado ? 22 : 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px;color:#1f1f1f">
              <span style="font-size:10px;letter-spacing:.05em;color:#737373;font-weight:700">PAP AGUARDANDO VÍNCULO</span><br/>
              <strong>${e(p.nome)}</strong><br/>
              ${e(p.cidade)}${p.km != null ? ` — km ${e(p.km)}` : ""}${
                p.sentido_pista ? ` (${e(SENTIDO_PISTA_LABELS[p.sentido_pista] ?? p.sentido_pista)})` : ""
              }<br/>
              Dias de funcionamento: ${formatarDatasFuncionamento(p.datas_funcionamento)}
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
      papMarkersRef.current.set(`pre:${p.id}`, marker);
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
              ${urlSegura(c.foto_url) ? `<img src="${urlSegura(c.foto_url)}" alt="Foto de ${e(c.nome)}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px" />` : ""}
              <span style="font-size:10px;letter-spacing:.05em;color:${cor};font-weight:700">${e(TIPO_COMERCIO_LABELS[c.tipo] ?? c.tipo)}</span><br/>
              <strong>${e(c.nome)}</strong><br/>
              ${c.telefone && c.exibir_telefone !== false ? `Telefone: ${e(c.telefone)}<br/>` : ""}
              ${c.cidade ? `Cidade: ${e(c.cidade)}<br/>` : ""}
              ${kmSentidoLabel(c.km_referencia, c.sentido_pista) ? `${e(kmSentidoLabel(c.km_referencia, c.sentido_pista))}<br/>` : ""}
              ${c.ponto_referencia ? `${e(c.ponto_referencia)}<br/>` : ""}
              ${c.descricao ? `${e(c.descricao)}` : ""}
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
    // onVotarAviso fica de fora de propósito: é uma função estável em
    // intenção, e recriar os marcadores a cada render fecharia o balão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontosApoio, pontosRisco, avisos, peregrinos, papsPreCadastro, pontosComerciais, permitirArrastarPapPreCadastro, papDestacado, linkEditarPapAdmin]);

  // Rodada 42 — busca de PAP em /mapa: leva o mapa até o PAP escolhido e
  // abre o popup com as informações dele (fechando qualquer outro aberto).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focoPap) return;
    const marker = papMarkersRef.current.get(focoPap.chave);
    if (!marker) return;
    markersRef.current.forEach((m) => {
      if (m !== marker && m.getPopup()?.isOpen()) m.togglePopup();
    });
    const abrir = () => {
      if (!marker.getPopup()?.isOpen()) marker.togglePopup();
    };
    map.once("moveend", abrir);
    map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 13), essential: true });
    // Garantia caso o mapa já esteja parado exatamente ali (sem "moveend").
    const reserva = window.setTimeout(abrir, 2500);
    return () => {
      map.off("moveend", abrir);
      window.clearTimeout(reserva);
    };
  }, [focoPap]);

  // Trajeto — linha ligando os pontos de check-in da rota, destacando os
  // já concluídos (verde) dos pendentes (âmbar)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function desenhar() {
      trajetoMarkersRef.current.forEach((m) => m.remove());
      trajetoMarkersRef.current = [];

      if (trajeto.length === 0) {
        if (map!.isStyleLoaded()) {
          if (map!.getLayer("trajeto-linha")) map!.removeLayer("trajeto-linha");
          if (map!.getSource("trajeto-linha")) map!.removeSource("trajeto-linha");
        }
        return;
      }

      const ordenado = [...trajeto].sort((a, b) => a.ordem - b.ordem);
      // A linha precisa do estilo do mapa carregado; os marcadores não —
      // eles aparecem na hora (Rodada 46), sem esperar os blocos do mapa.
      function desenharLinha() {
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
      }
      if (map!.isStyleLoaded()) desenharLinha();
      else map!.once("load", desenharLinha);

      ordenado.forEach((p) => {
        const el = document.createElement("div");
        const numero = p.feito && p.sequencia ? p.sequencia : null;
        if (numero) {
          el.style.cssText =
            "width:24px;height:24px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:800";
          el.textContent = String(numero);
        } else {
          const cor = p.feito ? "#16a34a" : "#d97706";
          el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${cor};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)`;
        }
        const status = numero
          ? `${numero}º check-in feito`
          : p.feito
            ? "Check-in feito"
            : "Check-in pendente";
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font-family:sans-serif"><strong>${e(p.cidade)}</strong><br/>${e(status)}</div>`
            )
          )
          .addTo(map!);
        trajetoMarkersRef.current.push(marker);
      });

      // Só enquadra o trajeto na primeira vez — depois de um check-in (que
      // redesenha os marcadores) o mapa fica onde a pessoa deixou.
      if (ordenado.length > 1 && !trajetoEnquadradoRef.current) {
        trajetoEnquadradoRef.current = true;
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

    desenhar();
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
  // Rodada 24: passou a poder ser ligado/desligado em tempo real por um
  // filtro no mapa do admin — antes só existia como "sempre ligado" (a
  // camada, uma vez criada, nunca era escondida de novo). Agora, em vez de
  // só não criar a camada quando calorPeregrinos é falso, ela é criada uma
  // única vez e depois só tem a visibilidade alternada — assim desmarcar o
  // filtro realmente some com o calor do mapa, em vez de deixá-lo "preso"
  // ligado para sempre a partir da primeira vez que apareceu.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function aplicar() {
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
        if (map!.getLayer("peregrinos-calor-layer")) {
          map!.setLayoutProperty(
            "peregrinos-calor-layer",
            "visibility",
            calorPeregrinos ? "visible" : "none"
          );
        }
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

    if (map.isStyleLoaded()) {
      aplicar();
    } else {
      map.once("load", aplicar);
    }
  }, [peregrinos, calorPeregrinos]);

  // Marcador da posição atual do próprio peregrino (na página de trajeto)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Rodada 46 — a posição chega várias vezes por minuto (watchPosition):
    // só move o marcador existente, em vez de recriar (o que fechava o
    // balão "Você está aqui" a cada atualização).
    if (minhaPosicao && minhaPosicaoMarkerRef.current) {
      minhaPosicaoMarkerRef.current.setLngLat([minhaPosicao.lng, minhaPosicao.lat]);
      return;
    }
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
