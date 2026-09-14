"use client";

import { Check } from "lucide-react";
import type { PontoCheckin } from "@/types/database";

interface Props {
  pontosCheckin: PontoCheckin[];
  checkinsFeitosIds: string[];
}

// Nomes de cidade compridos são abreviados para caber na linha do tempo
// horizontal — o nome completo continua disponível no atributo title.
function abreviarCidade(nome: string, max = 10) {
  if (nome.length <= max) return nome;
  return nome.slice(0, max - 1).trimEnd() + "…";
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
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center">
        {ordenados.map((p, i) => {
          const feito = feitosSet.has(p.id);
          const proximo = i === indiceProximo;
          const primeiro = i === 0;
          const ultimo = i === ordenados.length - 1;
          return (
            <div key={p.id} className="flex items-center">
              <div className="flex w-20 flex-col items-center">
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
                <p
                  className={`mt-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                    feito
                      ? "text-green-700 dark:text-green-400"
                      : proximo
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-neutral-400 dark:text-neutral-600"
                  }`}
                >
                  {primeiro ? "Origem" : ultimo ? "Destino" : " "}
                </p>
                <p
                  title={p.cidade}
                  className={`text-center text-[11px] font-semibold leading-tight ${
                    feito
                      ? "text-green-700 dark:text-green-400"
                      : proximo
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-neutral-500 dark:text-neutral-500"
                  }`}
                >
                  {abreviarCidade(p.cidade)}
                </p>
              </div>
              {!ultimo && (
                <div
                  className={`h-0.5 w-6 shrink-0 ${feito ? "bg-green-400" : "bg-neutral-200 dark:bg-neutral-800"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
