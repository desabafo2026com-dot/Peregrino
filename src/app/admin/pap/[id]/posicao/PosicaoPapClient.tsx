"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2 } from "lucide-react";
import type { PontoApoio } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export default function PosicaoPapClient({ ponto }: { ponto: PontoApoio }) {
  const router = useRouter();
  const [coords, setCoords] = useState({ lat: ponto.latitude, lng: ponto.longitude });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("pontos_apoio")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("id", ponto.id);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <p className="mb-2 text-xs text-neutral-500">Toque no mapa para marcar a nova posição.</p>
        <MapView
          pickMode
          onPick={(lat, lng) => {
            setCoords({ lat, lng });
            setOk(false);
          }}
          markerPreview={coords}
          center={[coords.lng, coords.lat]}
          height="400px"
          zoom={13}
        />
        <p className="mt-2 text-xs text-neutral-500">
          Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      </div>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      {ok && (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 size={16} /> Posição salva com sucesso.
        </p>
      )}
      <button onClick={salvar} disabled={salvando} className="btn-primary">
        {salvando ? "Salvando..." : "Salvar nova posição"}
      </button>
    </div>
  );
}
