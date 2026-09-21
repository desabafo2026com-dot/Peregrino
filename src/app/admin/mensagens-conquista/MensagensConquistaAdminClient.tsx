"use client";

import { useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MensagemConquista } from "@/types/database";

export default function MensagensConquistaAdminClient({
  mensagensIniciais,
}: {
  mensagensIniciais: MensagemConquista[];
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function alternarAtivo(id: string, ativo: boolean) {
    setLoadingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("mensagens_conquista").update({ ativo }).eq("id", id);
    setLoadingId(null);
    if (error) return;
    setMensagens((prev) => prev.map((m) => (m.id === id ? { ...m, ativo } : m)));
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
          <div className="mt-2">
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
          </div>
        </div>
      ))}
    </div>
  );
}
