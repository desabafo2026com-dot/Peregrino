"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MapPinPlus, Trash2, Clock, CheckCircle2, XCircle, Sun, Moon, Pencil } from "lucide-react";
import { STATUS_PAP_LABELS } from "@/lib/constants";
import type { GerentePap, PontoApoio } from "@/types/database";

const STATUS_PAP_COLOR: Record<string, string> = {
  pendente: "text-amber-700 dark:text-amber-500",
  aprovado: "text-green-700 dark:text-green-400",
  rejeitado: "text-red-700 dark:text-red-400",
};

export default function GerentePapClient({
  gerente,
  pontosIniciais,
}: {
  gerente: GerentePap;
  pontosIniciais: PontoApoio[];
}) {
  const supabase = createClient();
  const [pontos, setPontos] = useState(pontosIniciais);

  async function excluir(id: string) {
    if (!confirm("Excluir este PAP?")) return;
    const { error } = await supabase.from("pontos_apoio").delete().eq("id", id);
    if (!error) setPontos((prev) => prev.filter((p) => p.id !== id));
  }

  async function alternarAberto(id: string, abertoAtual: boolean) {
    const { error } = await supabase
      .from("pontos_apoio")
      .update({ aberto_agora: !abertoAtual })
      .eq("id", id);
    if (!error) {
      setPontos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, aberto_agora: !abertoAtual } : p))
      );
    }
  }

  if (gerente.status === "rejeitado") {
    return (
      <div className="card flex items-start gap-3 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
        <XCircle className="mt-0.5 text-red-700" size={22} />
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          <p>Seu cadastro de Gerente de PAP foi bloqueado pela administração.</p>
          {gerente.observacao_admin && (
            <p className="mt-1 text-neutral-500">
              Observação da administração: {gerente.observacao_admin}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/gerente-pap/pap/novo" className="btn-primary flex items-center justify-center gap-2">
        <MapPinPlus size={18} /> Cadastrar novo PAP
      </Link>

      <div className="flex flex-col gap-2">
        {pontos.map((p) => (
          <div key={p.id} className="card flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{p.nome}</p>
                <p className="flex items-center gap-1 text-xs font-medium">
                  {p.status_aprovacao === "pendente" && <Clock size={14} className={STATUS_PAP_COLOR.pendente} />}
                  {p.status_aprovacao === "aprovado" && <CheckCircle2 size={14} className={STATUS_PAP_COLOR.aprovado} />}
                  {p.status_aprovacao === "rejeitado" && <XCircle size={14} className={STATUS_PAP_COLOR.rejeitado} />}
                  <span className={STATUS_PAP_COLOR[p.status_aprovacao]}>
                    {STATUS_PAP_LABELS[p.status_aprovacao]}
                  </span>
                  {p.km_referencia != null ? ` — km ${p.km_referencia}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Link
                  href={`/gerente-pap/pap/${p.id}/editar`}
                  className="rounded-lg p-2 text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/40"
                  aria-label="Editar PAP"
                >
                  <Pencil size={18} />
                </Link>
                <button
                  onClick={() => excluir(p.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  aria-label="Excluir PAP"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <button
              onClick={() => alternarAberto(p.id, p.aberto_agora)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${
                p.aberto_agora
                  ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              {p.aberto_agora ? <Sun size={16} /> : <Moon size={16} />}
              {p.aberto_agora ? "Aberto agora — toque para fechar" : "Fechado agora — toque para abrir"}
            </button>
          </div>
        ))}
        {pontos.length === 0 && (
          <p className="text-sm text-neutral-400">Você ainda não cadastrou nenhum PAP.</p>
        )}
      </div>
    </div>
  );
}
