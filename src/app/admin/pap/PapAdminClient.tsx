"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Clock, CheckCircle2, XCircle, MapPinned, QrCode, Link2 } from "lucide-react";
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
            {p.pre_cadastro_id ? " — vinculado da lista pública" : ""}
          </p>
          {p.ponto_referencia && (
            <p className="text-xs text-neutral-500">Referência: {p.ponto_referencia}</p>
          )}
          <p className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[p.status_aprovacao]}`}>
            <Icon size={14} /> {STATUS_PAP_LABELS[p.status_aprovacao]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.status_aprovacao === "pendente" && (
            <>
              <button onClick={() => atualizarStatus(p.id, "aprovado")} className="btn-primary text-xs">
                Aprovar
              </button>
              <button onClick={() => atualizarStatus(p.id, "rejeitado")} className="btn-secondary text-xs">
                Rejeitar
              </button>
            </>
          )}
          {p.status_aprovacao === "rejeitado" && (
            <button onClick={() => atualizarStatus(p.id, "aprovado")} className="btn-secondary text-xs">
              Aprovar mesmo assim
            </button>
          )}
          {p.status_aprovacao === "aprovado" && (
            <Link
              href={`/pap/${p.id}`}
              target="_blank"
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <Link2 size={14} /> Ver página pública
            </Link>
          )}
          <Link
            href={`/admin/pap/${p.id}/qrcode`}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <QrCode size={14} /> QR code
          </Link>
        </div>
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
