"use client";

import dynamic from "next/dynamic";
import type { PontoApoio, PontoRisco, RiscoInformado } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  pontosApoio: PontoApoio[];
  pontosRisco: PontoRisco[];
  avisos: RiscoInformado[];
  peregrinos: { user_id: string; latitude: number; longitude: number }[];
}

export default function AdminMapClient({ pontosApoio, pontosRisco, avisos, peregrinos }: Props) {
  return (
    <MapView
      pontosApoio={pontosApoio}
      pontosRisco={pontosRisco}
      avisos={avisos}
      peregrinos={peregrinos}
      calorPeregrinos
      height="55vh"
    />
  );
}
