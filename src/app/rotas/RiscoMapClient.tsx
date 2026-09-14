"use client";

import dynamic from "next/dynamic";
import type { PontoRisco } from "@/types/database";
import type { RotaLinha } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export default function RiscoMapClient({
  pontosRisco,
  rotasLinhas,
}: {
  pontosRisco: PontoRisco[];
  rotasLinhas: RotaLinha[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {rotasLinhas.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
          {rotasLinhas.map((r) => (
            <span key={r.nome} className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-5 rounded-full"
                style={{ backgroundColor: r.cor }}
                aria-hidden="true"
              />
              {r.nome}
            </span>
          ))}
        </div>
      )}
      <MapView pontosRisco={pontosRisco} rotasLinhas={rotasLinhas} height="400px" />
    </div>
  );
}
