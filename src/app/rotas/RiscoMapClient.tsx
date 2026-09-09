"use client";

import dynamic from "next/dynamic";
import type { PontoRisco } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export default function RiscoMapClient({ pontosRisco }: { pontosRisco: PontoRisco[] }) {
  return <MapView pontosRisco={pontosRisco} height="400px" />;
}
