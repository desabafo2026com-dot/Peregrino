"use client";

import { useEffect, useState } from "react";
import { dataHoraCarimbo, svgCarimboSaida, svgCarimboSanta } from "@/lib/carimbo-svg";

// Rodada 73 — carimbo de saída (contorno da cidade de início) e carimbo de
// chegada (Nossa Senhora Aparecida), que só aparece depois da chegada.
export function CarimboSaida({ cidade, uf, iso }: { cidade: string; uf: string | null; iso: string }) {
  const [caminho, setCaminho] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams({ cidade });
    if (uf) params.set("uf", uf);
    fetch(`/api/contorno-cidade?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCaminho(d?.caminho ?? null))
      .catch(() => setCaminho(null));
  }, [cidade, uf]);
  return (
    <div
      role="img"
      aria-label={`Carimbo de saída de ${cidade}`}
      className="w-full [&>svg]:h-auto [&>svg]:w-full"
      style={{ transform: "rotate(-4deg)" }}
      dangerouslySetInnerHTML={{ __html: svgCarimboSaida({ caminho, cidade, iso }) }}
    />
  );
}

export function CarimboChegada({ iso }: { iso: string }) {
  const { data, hora } = dataHoraCarimbo(iso);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="img"
        aria-label="Carimbo de chegada em Aparecida"
        className="w-48 [&>svg]:h-auto [&>svg]:w-full"
        style={{ transform: "rotate(-3deg)" }}
        dangerouslySetInnerHTML={{ __html: svgCarimboSanta("/arte/santa-desenho-escuro.webp") }}
      />
      <p className="text-sm font-bold text-[#1f3b6b]" style={{ textAlign: "center" }}>
        Chegada em Aparecida · {data} às {hora}
      </p>
    </div>
  );
}
