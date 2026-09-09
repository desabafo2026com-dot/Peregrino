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

interface Props {
  pontosApoio?: PontoApoio[];
  pontosRisco?: PontoRisco[];
  peregrinos?: PeregrinoAtivo[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  markerPreview?: { lat: number; lng: number } | null;
}

function servicosLabel(servicos: string[]) {
  return servicos.length ? servicos.join(", ") : "—";
}

export default function MapView({
  pontosApoio = [],
  pontosRisco = [],
  peregrinos = [],
  center = DEFAULT_CENTER,
  zoom = 9,
  height = "500px",
  pickMode = false,
  onPick,
  markerPreview = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const previewMarkerRef = useRef<Marker | null>(null);

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
              <strong>${p.nome}</strong><br/>
              ${p.responsavel ? `Responsável: ${p.responsavel}<br/>` : ""}
              ${p.telefone ? `Tel: ${p.telefone}<br/>` : ""}
              ${p.periodo_funcionamento ? `Horário: ${p.periodo_funcionamento}<br/>` : ""}
              Serviços: ${servicosLabel(p.servicos)}<br/>
              ${p.contato_doacao ? `Doações: ${p.contato_doacao}` : ""}
            </div>
          `)
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    pontosRisco.forEach((r) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:22px;height:22px;border-radius:4px;background:#dc2626;border:2px solid white;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,.4)";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([r.longitude, r.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:sans-serif;max-width:220px">
              <strong style="color:#dc2626">⚠ ${r.titulo}</strong><br/>
              ${r.descricao ?? ""}<br/>
              Nível de risco: ${r.nivel_risco}/5
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
