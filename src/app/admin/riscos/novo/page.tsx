"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NIVEL_RISCO_LABELS } from "@/lib/constants";
import { LocateFixed } from "lucide-react";
import type { Rota } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

const TIPOS = [
  { value: "geral", label: "Geral" },
  { value: "transito", label: "Trânsito / atropelamento" },
  { value: "assalto", label: "Assalto / segurança" },
  { value: "sem_acostamento", label: "Sem acostamento / marginal" },
  { value: "animal", label: "Animais na pista" },
  { value: "iluminacao", label: "Falta de iluminação" },
];

export default function NovoRiscoPage() {
  const router = useRouter();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaId, setRotaId] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("geral");
  const [nivelRisco, setNivelRisco] = useState("3");
  const [kmReferencia, setKmReferencia] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rotas")
      .select("*")
      .order("ordem")
      .then(({ data }) => setRotas((data ?? []) as Rota[]));
  }, []);

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErro("Não foi possível obter sua localização. Marque no mapa.")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!coords) {
      setErro("Marque a localização do risco no mapa (ou use sua localização atual).");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("pontos_risco").insert({
      titulo,
      descricao: descricao || null,
      latitude: coords.lat,
      longitude: coords.lng,
      km_referencia: kmReferencia ? Number(kmReferencia) : null,
      tipo,
      nivel_risco: Number(nivelRisco),
      rota_id: rotaId || null,
    });
    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }
    router.push("/rotas");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-xl font-bold">Cadastrar local de risco</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Marque no mapa um trecho específico de maior perigo para os
        peregrinos que caminham ou pedalam pela rodovia.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="card">
          <h3 className="mb-3 text-base font-bold text-red-700">Localização</h3>
          <button
            type="button"
            onClick={usarLocalizacaoAtual}
            className="btn-secondary mb-3 flex items-center gap-2"
          >
            <LocateFixed size={18} /> Usar minha localização atual
          </button>
          <p className="mb-2 text-xs text-neutral-500">
            Ou toque no mapa para marcar o ponto exato.
          </p>
          <MapView
            pickMode
            onPick={(lat, lng) => setCoords({ lat, lng })}
            markerPreview={coords ? { lat: coords.lat, lng: coords.lng } : null}
            height="350px"
            zoom={10}
          />
          {coords && (
            <p className="mt-2 text-xs text-neutral-500">
              Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 text-base font-bold text-red-700">Dados do risco</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input required className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nível de risco</label>
              <select className="input" value={nivelRisco} onChange={(e) => setNivelRisco(e.target.value)}>
                {Object.entries(NIVEL_RISCO_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {v} — {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Km de referência</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={kmReferencia}
                onChange={(e) => setKmReferencia(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Rota</label>
              <select className="input" value={rotaId} onChange={(e) => setRotaId(e.target.value)}>
                <option value="">Ambas as rotas</option>
                {rotas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} ({r.origem} → {r.destino})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <textarea
                className="input"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>
        </div>

        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {erro}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Salvando..." : "Cadastrar local de risco"}
        </button>
      </form>
    </div>
  );
}
