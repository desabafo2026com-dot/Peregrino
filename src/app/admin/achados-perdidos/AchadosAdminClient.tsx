"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dataHoraBR } from "@/lib/datas-br";

export interface AnuncioAdmin {
  id: string;
  tipo: "perdido" | "achado";
  titulo: string;
  descricao: string | null;
  local_texto: string | null;
  contato: string | null;
  nome: string;
  cidade: string | null;
  status: "aberto" | "resolvido";
  ativo: boolean;
  criado_em: string;
  expira_em: string;
}

export default function AchadosAdminClient({ iniciais }: { iniciais: AnuncioAdmin[] }) {
  const [lista, setLista] = useState(iniciais);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(a: AnuncioAdmin) {
    setErro(null);
    const { error } = await createClient().from("achados_perdidos").update({ ativo: !a.ativo }).eq("id", a.id);
    if (error) return setErro(error.message);
    setLista((l) => l.map((x) => (x.id === a.id ? { ...x, ativo: !x.ativo } : x)));
  }

  if (lista.length === 0) return <p className="text-sm text-neutral-500">Nenhum anúncio ainda.</p>;

  return (
    <div className="flex flex-col gap-2">
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {lista.map((a) => (
        <div key={a.id} className={`card flex flex-col gap-1 ${!a.ativo ? "opacity-60" : ""}`}>
          <p className="text-sm font-bold">
            {a.tipo === "perdido" ? "Perdido" : "Achado"}: {a.titulo}
            <span className="ml-2 text-xs font-normal text-neutral-500">
              {a.status === "resolvido" ? "resolvido" : "aberto"}
              {!a.ativo ? " · oculto" : ""}
            </span>
          </p>
          {a.descricao && <p className="text-sm">{a.descricao}</p>}
          <p className="text-xs text-neutral-500">
            {[a.local_texto, a.contato, `${a.nome}${a.cidade ? `, de ${a.cidade}` : ""}`, dataHoraBR(a.criado_em)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <button
            type="button"
            onClick={() => alternar(a)}
            className={`mt-1 flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
              a.ativo ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            }`}
          >
            {a.ativo ? (
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
