"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PontoApoio, PontoRisco } from "@/types/database";

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

interface Props {
  pontosApoio?: PontoApoio[];
  pontosRisco?: PontoRisco[];
  peregrinos?: PeregrinoAtivo[];
  trajeto?: PontoTrajeto[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  markerPreview?: { lat: number; lng: number } | null;
  calorPeregrinos?: boolean;
  minhaPosicao?: { lat: number; lng: number } | null;
}

function servicosLabel(servicos: string[]) {
  return servicos.length ? servicos.join(", ") : "—";
}

export default function MapView({
  pontosApoio = [],
  pontosRisco = [],
  peregrinos = [],
  trajeto = [],
  center = DEFAULT_CENTER,
  zoom = 9,
  height = "500px",
  pickMode = false,
  onPick,
  markerPreview = null,
  calorPeregrinos = false,
  minhaPosicao = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const trajetoMarkersRef = useRef<Marker[]>([]);
  const previewMarkerRef = useRef<Marker | null>(null);
  const minhaPosicaoMarkerRef = useRef<Marker | null>(null);

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
      const el = document.createElement("div");
      el.style.cssText =
        "width:28px;height:28px;border-radius:50% 50% 50% 0;background:#92400e;border:2px solid white;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,.4)";
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px">
              <span style="font-size:10px;letter-spacing:.05em;color:#92400e;font-weight:700">PAP</span><br/>
              <strong>${p.nome}</strong><br/>
              ${p.cidade ? `${p.cidade}${p.sentido_pista ? ` — sentido ${p.sentido_pista === "sp" ? "São Paulo" : "Rio de Janeiro"}` : ""}<br/>` : ""}
              ${p.responsavel ? `Responsável: ${p.responsavel}<br/>` : ""}
              ${p.telefone && p.exibir_telefone !== false ? `Tel: ${p.telefone}<br/>` : ""}
              ${p.periodo_funcionamento ? `Horário: ${p.periodo_funcionamento}<br/>` : ""}
              ${
                p.aberto_agora === false
                  ? `<span style="color:#dc2626;font-weight:600">Fechado no momento</span><br/>`
                  : `<span style="color:#16a34a;font-weight:600">Aberto agora</span><br/>`
              }
              Serviços: ${servicosLabel(p.servicos)}<br/>
              ${
                p.aceita_doacoes
                  ? `<span style="color:#92400e;font-weight:600">Aceita doações</span>${p.doacao_necessidade ? `: ${p.doacao_necessidade}` : ""}<br/>${p.contato_doacao ? `Contato doação: ${p.contato_doacao}` : ""}`
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
      // moderado/baixo (1-3).
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
            <div style="font-family:sans-serif;max-width:220px">
              <strong style="color:${cor}">🚩 ${r.titulo}</strong><br/>
              ${r.descricao ?? ""}<br/>
              Nível de risco: ${r.nivel_risco}/5 (${alto ? "Alto/Muito alto" : "Moderado/baixo"})
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
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML("Peregrino em caminhada"))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [pontosApoio, pontosRisco, peregrinos]);

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
