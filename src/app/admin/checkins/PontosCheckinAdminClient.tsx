"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, MapPin } from "lucide-react";
import { nomeRota } from "@/lib/constants";
import type { PontoCheckin, Rota } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export default function PontosCheckinAdminClient({
  rotas,
  pontosIniciais,
}: {
  rotas: Rota[];
  pontosIniciais: PontoCheckin[];
}) {
  const [pontos, setPontos] = useState(pontosIniciais);
  const [rotaId, setRotaId] = useState(rotas[0]?.id ?? "");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const daRota = pontos.filter((p) => p.rota_id === rotaId).sort((a, b) => a.ordem - b.ordem);
  const selecionado = pontos.find((p) => p.id === selecionadoId) ?? null;

  function escolher(p: PontoCheckin) {
    setSelecionadoId(p.id);
    setCoords({ lat: p.latitude, lng: p.longitude });
    setMensagem(null);
  }

  async function salvar() {
    if (!selecionado || !coords) return;
    setSalvando(true);
    setMensagem(null);
    const supabase = createClient();
    // A mesma cidade aparece nas duas rotas em alguns casos (ex.: Aparecida):
    // atualiza todas as linhas dessa cidade para ficarem no mesmo lugar.
    const { error } = await supabase
      .from("pontos_checkin")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("cidade", selecionado.cidade);
    setSalvando(false);
    if (error) {
      setMensagem({ tipo: "erro", texto: "Não foi possível salvar: " + error.message });
      return;
    }
    setPontos((prev) =>
      prev.map((p) => (p.cidade === selecionado.cidade ? { ...p, latitude: coords.lat, longitude: coords.lng } : p))
    );
    setMensagem({ tipo: "ok", texto: `Posição de ${selecionado.cidade} salva.` });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {rotas.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRotaId(r.id);
              setSelecionadoId(null);
              setCoords(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${rotaId === r.id ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"}`}
          >
            {nomeRota(r)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {daRota.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => escolher(p)}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${selecionadoId === p.id ? "border-amber-600 bg-amber-50 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" : "border-neutral-200 dark:border-neutral-800"}`}
          >
            <MapPin size={13} /> {p.ordem}. {p.cidade}
          </button>
        ))}
      </div>

      {selecionado && coords ? (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-semibold">
            {selecionado.cidade} — toque no mapa, sobre a rodovia, para marcar o ponto.
          </p>
          <MapView
            key={selecionado.id}
            pickMode
            onPick={(lat, lng) => {
              setCoords({ lat, lng });
              setMensagem(null);
            }}
            markerPreview={coords}
            center={[coords.lng, coords.lat]}
            height="420px"
            zoom={13}
          />
          <p className="text-xs text-neutral-500">
            Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
          {mensagem && (
            <p
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${mensagem.tipo === "ok" ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}
            >
              {mensagem.tipo === "ok" && <CheckCircle2 size={16} />} {mensagem.texto}
            </p>
          )}
          <button type="button" onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? "Salvando..." : `Salvar posição de ${selecionado.cidade}`}
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Escolha uma cidade acima.</p>
      )}
    </div>
  );
}
