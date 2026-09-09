"use client";

import { useState } from "react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import { Radio, Award, MapPin } from "lucide-react";

export interface PeregrinoLinha {
  id: string;
  nome: string;
  status: "em_andamento" | "concluida";
  meioTransporte: string;
  rotaNome: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  checkinsCount: number;
  localizacaoAtual: { latitude: number; longitude: number; atualizadoEm: string } | null;
}

export default function PeregrinosAdminClient({
  ativos,
  concluidos,
}: {
  ativos: PeregrinoLinha[];
  concluidos: PeregrinoLinha[];
}) {
  const [aba, setAba] = useState<"ativos" | "concluidos">("ativos");
  const lista = aba === "ativos" ? ativos : concluidos;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => setAba("ativos")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            aba === "ativos"
              ? "bg-amber-800 text-white"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          Ativos agora ({ativos.length})
        </button>
        <button
          onClick={() => setAba("concluidos")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            aba === "concluidos"
              ? "bg-amber-800 text-white"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          Concluídos recentemente ({concluidos.length})
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {lista.map((p) => (
          <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                {p.status === "em_andamento" ? (
                  <Radio size={16} className="text-green-600" />
                ) : (
                  <Award size={16} className="text-amber-700" />
                )}
                {p.nome}
              </p>
              <p className="text-xs text-neutral-500">
                {MEIO_TRANSPORTE_LABELS[p.meioTransporte] ?? p.meioTransporte}
                {p.rotaNome ? ` — ${p.rotaNome}` : ""} — {p.checkinsCount} check-in(s)
              </p>
              <p className="text-xs text-neutral-500">
                Início:{" "}
                {p.dataInicio ? new Date(p.dataInicio).toLocaleString("pt-BR") : "-"}
                {p.dataFim ? ` — Fim: ${new Date(p.dataFim).toLocaleString("pt-BR")}` : ""}
              </p>
              {p.localizacaoAtual && (
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin size={12} /> {p.localizacaoAtual.latitude.toFixed(4)},{" "}
                  {p.localizacaoAtual.longitude.toFixed(4)} — atualizado{" "}
                  {new Date(p.localizacaoAtual.atualizadoEm).toLocaleTimeString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        ))}
        {lista.length === 0 && (
          <p className="text-sm text-neutral-400">Nenhum registro nesta categoria.</p>
        )}
      </div>
    </div>
  );
}
