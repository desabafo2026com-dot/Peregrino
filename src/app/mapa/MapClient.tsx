"use client";

import dynamic from "next/dynamic";
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

export default function MapClient({ pontosApoio, pontosRisco, peregrinos }: Props) {
  return (
    <MapView
      pontosApoio={pontosApoio}
      pontosRisco={pontosRisco}
      peregrinos={peregrinos}
      height="65vh"
    />
  );
}
