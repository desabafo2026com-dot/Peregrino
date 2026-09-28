"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PapTransferencia } from "@/types/database";

// Rodada 38 — mostrada no topo de /gerente-pap quando existe algum pedido
// de outro gerente querendo assumir um PAP que hoje está vinculado a esta
// conta (ver solicitar_transferencia_pap). Aceitar troca o gerente_id do
// PAP na hora (responder_transferencia_pap) — o PAP some da lista desta
// conta, por isso quem usa este componente informa `onAceitar` para tirar
// o PAP da própria lista em memória sem precisar recarregar a página.
// Negar só encerra o pedido — o PAP continua com o gerente atual.
export default function SolicitacoesTransferenciaRecebidas({
  solicitacoes,
  onAceitar,
}: {
  solicitacoes: PapTransferencia[];
  onAceitar: (papId: string) => void;
}) {
  const [itens, setItens] = useState(solicitacoes);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function responder(s: PapTransferencia, aceitar: boolean) {
    setProcessando(s.id);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("responder_transferencia_pap", {
      p_id: s.id,
      p_aceitar: aceitar,
    });
    setProcessando(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setItens((prev) => prev.filter((item) => item.id !== s.id));
    if (aceitar) onAceitar(s.pap_id);
  }

  if (itens.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-500">
        <ArrowLeftRight size={16} /> Pedido(s) para assumir um PAP seu
      </h3>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      {itens.map((s) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-neutral-900"
        >
          <p className="text-sm">
            <span className="font-semibold">{s.solicitante_nome}</span> quer assumir o PAP{" "}
            <span className="font-semibold">{s.pap_nome}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => responder(s, true)}
              disabled={processando === s.id}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Check size={14} /> Aceitar
            </button>
            <button
              onClick={() => responder(s, false)}
              disabled={processando === s.id}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <X size={14} /> Negar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
