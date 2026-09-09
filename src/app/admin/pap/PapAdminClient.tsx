"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, CheckCircle2, XCircle, MapPinned } from "lucide-react";
import { STATUS_PAP_LABELS } from "@/lib/constants";
import type { PontoApoio } from "@/types/database";

const STATUS_COLOR: Record<string, string> = {
  pendente: "text-amber-700 dark:text-amber-500",
  aprovado: "text-green-700 dark:text-green-400",
  rejeitado: "text-red-700 dark:text-red-400",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pendente: Clock,
  aprovado: CheckCircle2,
  rejeitado: XCircle,
};

export default function PapAdminClient({ pontosIniciais }: { pontosIniciais: PontoApoio[] }) {
  const supabase = createClient();
  const [pontos, setPontos] = useState(pontosIniciais);

  async function atualizarStatus(id: string, status: "aprovado" | "rejeitado") {
    const { error } = await supabase.from("pontos_apoio").update({ status_aprovacao: status }).eq("id", id);
    if (!error) {
      setPontos((prev) => prev.map((p) => (p.id === id ? { ...p, status_aprovacao: status } : p)));
    }
  }

  const pendentes = pontos.filter((p) => p.status_aprovacao === "pendente");
  const outros = pontos.filter((p) => p.status_aprovacao !== "pendente");

  function Card({ p }: { p: PontoApoio }) {
    const Icon = STATUS_ICON[p.status_aprovacao];
    return (
      <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <MapPinned size={16} className="text-amber-700" />
            {p.nome}
          </p>
          <p className="text-xs text-neutral-500">
            {p.km_referencia != null ? `km ${p.km_referencia} — ` : ""}
            {p.gerente_id ? "cadastrado por gerente de PAP" : "cadastrado pela administração"}
          </p>
          <p className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[p.status_aprovacao]}`}>
            <Icon size={14} /> {STATUS_PAP_LABELS[p.status_aprovacao]}
          </p>
        </div>
        {p.status_aprovacao === "pendente" && (
          <div className="flex gap-2">
            <button onClick={() => atualizarStatus(p.id, "aprovado")} className="btn-primary text-xs">
              Aprovar
            </button>
            <button onClick={() => atualizarStatus(p.id, "rejeitado")} className="btn-secondary text-xs">
              Rejeitar
            </button>
          </div>
        )}
        {p.status_aprovacao === "rejeitado" && (
          <button onClick={() => atualizarStatus(p.id, "aprovado")} className="btn-secondary text-xs">
            Aprovar mesmo assim
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-500">
          Pendentes de aprovação ({pendentes.length})
        </h3>
        <div className="flex flex-col gap-2">
          {pendentes.map((p) => (
            <Card key={p.id} p={p} />
          ))}
          {pendentes.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhum PAP pendente no momento.</p>
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Demais PAP
        </h3>
        <div className="flex flex-col gap-2">
          {outros.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
