"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Circle, TriangleAlert, ShieldAlert } from "lucide-react";
import { LADO_RODOVIA_LABELS, NIVEL_RISCO_LABELS } from "@/lib/constants";
import type { Peregrinacao, PontoCheckin, PontoRisco, Rota, TrechoSeguranca } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  peregrinacao: Peregrinacao;
  pontosCheckin: PontoCheckin[];
  checkinsFeitosIdsIniciais: string[];
  trechos: TrechoSeguranca[];
  riscos: PontoRisco[];
  rota: Rota | null;
}

function riscoColor(nivel: number) {
  if (nivel >= 4) return "text-red-600";
  if (nivel === 3) return "text-amber-600";
  return "text-green-600";
}

export default function TrajetoClient({
  peregrinacao,
  pontosCheckin,
  checkinsFeitosIdsIniciais,
  trechos,
  riscos,
  rota,
}: Props) {
  const supabase = createClient();
  const [checkinsFeitos, setCheckinsFeitos] = useState(new Set(checkinsFeitosIdsIniciais));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [minhaPosicao, setMinhaPosicao] = useState<{ lat: number; lng: number } | null>(null);

  // Mostra a posição atual do peregrino no mapa do trajeto.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMinhaPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  async function fazerCheckin(ponto: PontoCheckin) {
    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }
    setErro(null);
    setLoadingId(ponto.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.from("checkins").insert({
          peregrinacao_id: peregrinacao.id,
          user_id: peregrinacao.user_id,
          ponto_checkin_id: ponto.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoadingId(null);
        if (error) {
          setErro(error.message);
          return;
        }
        setCheckinsFeitos((prev) => new Set(prev).add(ponto.id));
      },
      () => {
        setLoadingId(null);
        setErro("Não foi possível acessar sua localização.");
      }
    );
  }

  const concluidos = pontosCheckin.filter((p) => checkinsFeitos.has(p.id)).length;

  const trajeto = pontosCheckin.map((p) => ({
    ordem: p.ordem,
    cidade: p.cidade,
    lat: p.latitude,
    lng: p.longitude,
    feito: checkinsFeitos.has(p.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      {pontosCheckin.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
            Mapa do trajeto
          </h2>
          <MapView
            trajeto={trajeto}
            minhaPosicao={minhaPosicao}
            center={[pontosCheckin[0].longitude, pontosCheckin[0].latitude]}
            zoom={7}
            height="350px"
          />
        </section>
      )}

      {rota && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-amber-800 dark:text-amber-500">
            <span>Progresso</span>
            <span>
              {concluidos} / {pontosCheckin.length} cidades
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-amber-700"
              style={{
                width: `${pontosCheckin.length ? (concluidos / pontosCheckin.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
          Pontos de check-in por cidade
        </h2>
        <div className="flex flex-col gap-2">
          {pontosCheckin.map((p) => {
            const feito = checkinsFeitos.has(p.id);
            return (
              <div
                key={p.id}
                className={`card flex items-center justify-between gap-3 ${
                  feito ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {feito ? (
                    <CheckCircle2 className="text-green-600" size={22} />
                  ) : (
                    <Circle className="text-neutral-300" size={22} />
                  )}
                  <div>
                    <p className="font-semibold">
                      {p.ordem}. {p.cidade}
                    </p>
                    {p.km_aproximado != null && (
                      <p className="text-xs text-neutral-500">≈ km {p.km_aproximado} da rota</p>
                    )}
                    {p.descricao && <p className="text-xs text-neutral-500">{p.descricao}</p>}
                  </div>
                </div>
                {!feito && (
                  <button
                    onClick={() => fazerCheckin(p)}
                    disabled={loadingId === p.id}
                    className="btn-secondary whitespace-nowrap text-xs"
                  >
                    {loadingId === p.id ? "..." : "Fazer check-in"}
                  </button>
                )}
              </div>
            );
          })}
          {pontosCheckin.length === 0 && (
            <p className="text-sm text-neutral-400">
              Nenhum ponto de check-in cadastrado para esta rota ainda.
            </p>
          )}
        </div>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </section>

      {trechos.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
            <ShieldAlert size={20} /> Lado da rodovia por trecho
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                  <th className="pb-2 pr-4">Km</th>
                  <th className="pb-2 pr-4">Lado recomendado</th>
                  <th className="pb-2 pr-4">Risco</th>
                  <th className="pb-2">Observação</th>
                </tr>
              </thead>
              <tbody>
                {trechos.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {t.km_inicial} – {t.km_final}
                    </td>
                    <td className="py-2 pr-4 font-medium">{LADO_RODOVIA_LABELS[t.lado_recomendado]}</td>
                    <td className={`py-2 pr-4 font-medium ${riscoColor(t.nivel_risco)}`}>
                      {NIVEL_RISCO_LABELS[t.nivel_risco]}
                    </td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-300">{t.observacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {riscos.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700">
            <TriangleAlert size={20} /> Pontos de maior risco
          </h2>
          <div className="flex flex-col gap-2">
            {riscos.map((r) => (
              <div key={r.id} className="card">
                <p className="font-semibold text-red-700">⚠ {r.titulo}</p>
                {r.descricao && <p className="text-sm text-neutral-600 dark:text-neutral-300">{r.descricao}</p>}
                <p className="text-xs text-neutral-500">Nível de risco: {r.nivel_risco}/5</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
