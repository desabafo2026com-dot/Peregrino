"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface ItemModeracao {
  id: string;
  tabela: "intencoes_peregrinacao" | "agradecimentos_pap";
  rotulo: string;
  texto: string;
  nome: string;
  cidade: string | null;
  ativo: boolean;
  criado_em: string;
}

export default function MuralAdminClient({ itensIniciais, vazio }: { itensIniciais: ItemModeracao[]; vazio: string }) {
  const [itens, setItens] = useState(itensIniciais);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(item: ItemModeracao) {
    setLoadingId(item.id);
    setErro(null);
    const { error } = await createClient().from(item.tabela).update({ ativo: !item.ativo }).eq("id", item.id);
    setLoadingId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)));
  }

  if (itens.length === 0) return <p className="text-sm text-neutral-500">{vazio}</p>;

  return (
    <div className="flex flex-col gap-2">
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {itens.map((m) => (
        <div key={m.id} className={`card ${!m.ativo ? "opacity-60" : ""}`}>
          <p className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase">{m.rotulo}</p>
          <p className="text-sm text-neutral-700 italic dark:text-neutral-200">&quot;{m.texto}&quot;</p>
          <p className="mt-1 text-xs text-neutral-400">
            — {m.nome}
            {m.cidade ? `, de ${m.cidade}` : ""} · {new Date(m.criado_em).toLocaleDateString("pt-BR")}
            {!m.ativo && " · oculta"}
          </p>
          <button
            disabled={loadingId === m.id}
            onClick={() => alternar(m)}
            className={`mt-2 flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
              m.ativo
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300"
            }`}
          >
            {m.ativo ? (
              <>
                <EyeOff size={14} /> Ocultar
              </>
            ) : (
              <>
                <Eye size={14} /> Reexibir
              </>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
