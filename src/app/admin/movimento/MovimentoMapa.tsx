"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CidadeContagem } from "@/lib/movimento-cidades";

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

// Trecho São Paulo – Aparecida – Resende
const LIMITES: [[number, number], [number, number]] = [
  [-46.9, -23.65],
  [-44.0, -22.3],
];

interface Props {
  cidades: CidadeContagem[];
  modo: "real" | "simulado";
  cor: string;
  maximo: number;
}

export default function MovimentoMapa({ cidades, modo, cor, maximo }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapLibreMap | null>(null);
  const marcadoresRef = useRef<Map<string, { marker: Marker; el: HTMLDivElement }>>(new Map());

  useEffect(() => {
    if (!divRef.current) return;
    const mapa = new maplibregl.Map({
      container: divRef.current,
      style: OSM_STYLE,
      bounds: LIMITES,
      fitBoundsOptions: { padding: 20 },
      attributionControl: { compact: true },
    });
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapaRef.current = mapa;
    const marcadores = marcadoresRef.current;
    return () => {
      marcadores.clear();
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const marcadores = marcadoresRef.current;
    const vistos = new Set<string>();
    const escala = Math.max(1, maximo);

    for (const c of cidades) {
      const valor = modo === "real" ? c.real : c.simulado;
      if (c.lat == null || c.lon == null || valor <= 0) continue;
      vistos.add(c.chave);
      const tamanho = Math.round(26 + 46 * Math.sqrt(valor / escala));
      let item = marcadores.get(c.chave);
      if (!item) {
        const el = document.createElement("div");
        el.style.borderRadius = "9999px";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "#fff";
        el.style.fontWeight = "700";
        el.style.fontSize = "12px";
        el.style.border = "2px solid #fff";
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,.35)";
        el.style.transition = "width .25s, height .25s, background-color .25s";
        el.style.cursor = "default";
        const marker = new maplibregl.Marker({ element: el }).setLngLat([c.lon, c.lat]).addTo(mapa);
        item = { marker, el };
        marcadores.set(c.chave, item);
      }
      item.el.style.width = `${tamanho}px`;
      item.el.style.height = `${tamanho}px`;
      item.el.style.backgroundColor = cor;
      item.el.style.opacity = "0.9";
      item.el.textContent = valor.toLocaleString("pt-BR");
      item.el.title = `${c.nome}: ${valor.toLocaleString("pt-BR")} ${valor === 1 ? "pessoa" : "pessoas"}`;
      item.el.setAttribute("aria-label", item.el.title);
    }

    for (const [chave, item] of marcadores) {
      if (!vistos.has(chave)) {
        item.marker.remove();
        marcadores.delete(chave);
      }
    }
  }, [cidades, modo, cor, maximo]);

  return <div ref={divRef} className="h-[55vh] min-h-[320px] w-full overflow-hidden rounded-2xl" />;
}
