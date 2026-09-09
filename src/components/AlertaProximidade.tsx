"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, MapPin } from "lucide-react";
import { distanciaMetros } from "@/lib/geo";
import type { PontoCheckin } from "@/types/database";

const RAIO_ALERTA_M = 1500;

interface Props {
  pontosCheckin: PontoCheckin[];
  checkinsFeitosIds: string[];
  onCheckin: (ponto: PontoCheckin) => void;
}

// Sino de alertas: avisa (só enquanto o app está aberto) quando o
// peregrino está perto do próximo ponto de check-in da rota.
export default function AlertaProximidade({ pontosCheckin, checkinsFeitosIds, onCheckin }: Props) {
  const [aberto, setAberto] = useState(false);
  const [proximo, setProximo] = useState<{ ponto: PontoCheckin; distancia: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const pendentes = pontosCheckin.filter((p) => !checkinsFeitosIds.includes(p.id));

  useEffect(() => {
    if (pendentes.length === 0 || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        let melhor: { ponto: PontoCheckin; distancia: number } | null = null;
        for (const ponto of pendentes) {
          const d = distanciaMetros(
            pos.coords.latitude,
            pos.coords.longitude,
            ponto.latitude,
            ponto.longitude
          );
          if (!melhor || d < melhor.distancia) melhor = { ponto, distancia: d };
        }
        if (melhor && melhor.distancia <= RAIO_ALERTA_M) {
          setProximo(melhor);
        } else {
          setProximo(null);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontosCheckin.length, checkinsFeitosIds.length]);

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label="Alertas de check-in"
        className="relative rounded-full border border-neutral-200 bg-white p-2 text-amber-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-amber-500"
      >
        <Bell size={20} />
        {proximo && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-600 dark:border-neutral-900" />
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {proximo ? (
            <>
              <p className="mb-2 flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-500">
                <MapPin size={16} /> Você está perto de {proximo.ponto.cidade}!
              </p>
              <p className="mb-3 text-neutral-600 dark:text-neutral-300">
                Cerca de {Math.round(proximo.distancia)} m de distância. Não
                esqueça de fazer o check-in.
              </p>
              <button
                onClick={() => {
                  onCheckin(proximo.ponto);
                  setAberto(false);
                }}
                className="btn-primary w-full"
              >
                Fazer check-in aqui
              </button>
            </>
          ) : (
            <p className="text-neutral-500">
              Nenhum alerta no momento. Avisamos aqui quando você se aproximar
              do próximo ponto de check-in (com o app aberto).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
