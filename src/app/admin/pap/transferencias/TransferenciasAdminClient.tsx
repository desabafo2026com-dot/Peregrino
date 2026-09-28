"use client";

import { useState } from "react";
import { ArrowRight, Check, X, Clock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_TRANSFERENCIA_PAP_LABELS } from "@/lib/constants";
import type { PapTransferencia } from "@/types/database";

const STATUS_COLOR: Record<string, string> = {
  pendente: "text-amber-700 dark:text-amber-500",
  aceita: "text-green-700 dark:text-green-400",
  negada: "text-red-700 dark:text-red-400",
};

export default function TransferenciasAdminClient({
  itensIniciais,
}: {
  itensIniciais: PapTransferencia[];
}) {
  const [itens, setItens] = useState(itensIniciais);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function resolver(id: string, aceitar: boolean) {
    setProcessando(id);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_resolver_transferencia_pap", {
      p_id: id,
      p_aceitar: aceitar,
    });
    setProcessando(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setItens((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: aceitar ? "aceita" : "negada", resolvido_por_admin: true, resolvido_em: new Date().toISOString() }
          : t
      )
    );
  }

  const pendentes = itens.filter((t) => t.status === "pendente");
  const resolvidas = itens.filter((t) => t.status !== "pendente");

  function Linha({ t }: { t: PapTransferencia }) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{t.pap_nome}</p>
          <p className="flex items-center gap-1 text-xs text-neutral-500">
            {t.gerente_atual_nome ?? "sem gerente vinculado"}
            <ArrowRight size={12} />
            {t.solicitante_nome}
          </p>
          <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[t.status]}`}>
            {t.status === "pendente" && <Clock size={12} />}
            {t.status === "aceita" && <Check size={12} />}
            {t.status === "negada" && <X size={12} />}
            {STATUS_TRANSFERENCIA_PAP_LABELS[t.status]}
            {t.resolvido_por_admin && t.status !== "pendente" && " — decidido pela administração"}
          </p>
          {!t.gerente_atual_id && t.status === "pendente" && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-500">
              <ShieldCheck size={12} /> Sem gerente atual — só a administração pode decidir
            </p>
          )}
        </div>
        {t.status === "pendente" && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => resolver(t.id, true)}
              disabled={processando === t.id}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Check size={14} /> Aprovar transferência
            </button>
            <button
              onClick={() => resolver(t.id, false)}
              disabled={processando === t.id}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <X size={14} /> Negar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-500">
          Pendentes ({pendentes.length})
        </h3>
        <div className="flex flex-col gap-2">
          {pendentes.map((t) => (
            <Linha key={t.id} t={t} />
          ))}
          {pendentes.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhuma solicitação pendente.</p>
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Histórico
        </h3>
        <div className="flex flex-col gap-2">
          {resolvidas.map((t) => (
            <Linha key={t.id} t={t} />
          ))}
          {resolvidas.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhuma transferência resolvida ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
