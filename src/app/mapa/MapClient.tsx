"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Tent, TriangleAlert } from "lucide-react";
import type { PontoApoio, PontoRisco } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  pontosApoio: PontoApoio[];
  pontosRisco: PontoRisco[];
  peregrinos: { user_id: string; latitude: number; longitude: number }[];
}

// PAP aparece marcado por padrão (é o que a maioria vem buscar); locais de
// risco ficam opcionais, para não poluir o mapa de quem só quer achar apoio.
export default function MapClient({ pontosApoio, pontosRisco, peregrinos }: Props) {
  const [mostrarPap, setMostrarPap] = useState(true);
  const [mostrarRisco, setMostrarRisco] = useState(false);

  const pontosApoioVisiveis = useMemo(() => (mostrarPap ? pontosApoio : []), [mostrarPap, pontosApoio]);
  const pontosRiscoVisiveis = useMemo(() => (mostrarRisco ? pontosRisco : []), [mostrarRisco, pontosRisco]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarPap}
            onChange={(e) => setMostrarPap(e.target.checked)}
          />
          <Tent size={16} className="text-green-600" /> PAP ({pontosApoio.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarRisco}
            onChange={(e) => setMostrarRisco(e.target.checked)}
          />
          <TriangleAlert size={16} className="text-red-600" /> Locais de risco ({pontosRisco.length})
        </label>
      </div>

      <MapView
        pontosApoio={pontosApoioVisiveis}
        pontosRisco={pontosRiscoVisiveis}
        peregrinos={peregrinos}
        calorPeregrinos={peregrinos.length > 0}
        height="65vh"
      />
    </div>
  );
}
