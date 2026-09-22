"use client";

import { useState } from "react";
import { EyeOff, Eye, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MensagemConquista } from "@/types/database";

export default function MensagensConquistaAdminClient({
  mensagensIniciais,
}: {
  mensagensIniciais: MensagemConquista[];
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Confirmação antes de excluir de vez (Rodada 29, a pedido do usuário) —
  // diferente de "ocultar", que é reversível, apagar do banco não é, por
  // isso pede uma segunda confirmação em vez de excluir no primeiro clique.
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [erroExcluir, setErroExcluir] = useState<{ id: string; mensagem: string } | null>(null);

  async function alternarAtivo(id: string, ativo: boolean) {
    setLoadingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("mensagens_conquista").update({ ativo }).eq("id", id);
    setLoadingId(null);
    if (error) return;
    setMensagens((prev) => prev.map((m) => (m.id === id ? { ...m, ativo } : m)));
  }

  // Exclusão definitiva (Rodada 29) — a política mensagens_conquista_delete_admin
  // já existe no banco desde a criação da tabela (só faltava o botão aqui).
  async function excluir(id: string) {
    setLoadingId(id);
    setErroExcluir(null);
    const supabase = createClient();
    const { error } = await supabase.from("mensagens_conquista").delete().eq("id", id);
    setLoadingId(null);
    if (error) {
      setErroExcluir({ id, mensagem: error.message });
      return;
    }
    setConfirmandoId(null);
    setMensagens((prev) => prev.filter((m) => m.id !== id));
  }

  if (mensagens.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhuma mensagem publicada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {mensagens.map((m) => (
        <div key={m.id} className={`card ${!m.ativo ? "opacity-60" : ""}`}>
          <p className="text-sm italic text-neutral-700 dark:text-neutral-200">&quot;{m.mensagem}&quot;</p>
          <p className="mt-1 text-xs text-neutral-400">
            — {m.nome}
            {m.cidade ? `, de ${m.cidade}` : ""} · {new Date(m.criado_em).toLocaleDateString("pt-BR")}
            {!m.ativo && " · oculta"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {m.ativo ? (
              <button
                disabled={loadingId === m.id}
                onClick={() => alternarAtivo(m.id, false)}
                className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
              >
                <EyeOff size={14} /> Ocultar
              </button>
            ) : (
              <button
                disabled={loadingId === m.id}
                onClick={() => alternarAtivo(m.id, true)}
                className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300"
              >
                <Eye size={14} /> Reexibir
              </button>
            )}

            {confirmandoId === m.id ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500">Excluir para sempre?</span>
                <button
                  disabled={loadingId === m.id}
                  onClick={() => excluir(m.id)}
                  className="rounded-lg bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {loadingId === m.id ? "Excluindo..." : "Sim, excluir"}
                </button>
                <button
                  disabled={loadingId === m.id}
                  onClick={() => setConfirmandoId(null)}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                disabled={loadingId === m.id}
                onClick={() => setConfirmandoId(m.id)}
                className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                <Trash2 size={14} /> Excluir
              </button>
            )}
          </div>
          {erroExcluir?.id === m.id && <p className="mt-1 text-xs text-red-600">{erroExcluir.mensagem}</p>}
        </div>
      ))}
    </div>
  );
}
