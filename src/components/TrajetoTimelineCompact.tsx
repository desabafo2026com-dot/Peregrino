"use client";

import { Check } from "lucide-react";
import type { PontoCheckin } from "@/types/database";

interface Props {
  pontosCheckin: PontoCheckin[];
  checkinsFeitosIds: string[];
}

export default function TrajetoTimelineCompact({ pontosCheckin, checkinsFeitosIds }: Props) {
  if (pontosCheckin.length === 0) {
    return (
      <p className="text-center text-sm text-neutral-400">
        Nenhum ponto de check-in cadastrado para esta rota ainda.
      </p>
    );
  }

  const feitosSet = new Set(checkinsFeitosIds);
  const ordenados = [...pontosCheckin].sort((a, b) => a.ordem - b.ordem);
  const indiceProximo = ordenados.findIndex((p) => !feitosSet.has(p.id));

  return (
    <div className="flex flex-col">
      {ordenados.map((p, i) => {
        const feito = feitosSet.has(p.id);
        const proximo = i === indiceProximo;
        const primeiro = i === 0;
        const ultimo = i === ordenados.length - 1;
        return (
          <div key={p.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  feito
                    ? "bg-green-600 text-white"
                    : proximo
                      ? "border-2 border-amber-500 text-amber-700 dark:text-amber-400"
                      : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800"
                }`}
              >
                {feito ? <Check size={13} /> : p.ordem}
              </div>
              {!ultimo && (
                <div
                  className={`w-0.5 flex-1 ${feito ? "bg-green-400" : "bg-neutral-200 dark:bg-neutral-800"}`}
                  style={{ minHeight: "18px" }}
                />
              )}
            </div>
            <div className={ultimo ? "pb-0" : "pb-3"}>
              <p
                className={`text-sm font-semibold ${
                  feito
                    ? "text-green-700 dark:text-green-400"
                    : proximo
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-neutral-400 dark:text-neutral-600"
                }`}
              >
                {primeiro ? "Origem — " : ultimo ? "Destino — " : ""}
                {p.cidade}
              </p>
              {feito && <p className="text-xs text-green-600 dark:text-green-500">Check-in feito ✓</p>}
              {proximo && !feito && (
                <p className="text-xs text-amber-600 dark:text-amber-500">Próximo check-in</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
