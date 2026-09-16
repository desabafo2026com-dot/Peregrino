"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TIPO_COMERCIO_LABELS, SENTIDO_KM_ABREV } from "@/lib/constants";
import { Hotel, Utensils, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { PontoComercial } from "@/types/database";

function kmSentidoLabel(km: number | null, sentido: string | null) {
  if (km == null) return null;
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

export default function HospedagemAdminClient({ comerciosIniciais }: { comerciosIniciais: PontoComercial[] }) {
  const [comercios, setComercios] = useState(comerciosIniciais);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  async function alternarAtivo(id: string, ativoAtual: boolean) {
    setProcessandoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("pontos_comerciais").update({ ativo: !ativoAtual }).eq("id", id);
    setProcessandoId(null);
    if (error) {
      alert("Não foi possível alterar: " + error.message);
      return;
    }
    setComercios((prev) => prev.map((c) => (c.id === id ? { ...c, ativo: !ativoAtual } : c)));
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir definitivamente "${nome}"? Essa ação não pode ser desfeita.`)) return;
    setProcessandoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("pontos_comerciais").delete().eq("id", id);
    setProcessandoId(null);
    if (error) {
      alert("Não foi possível excluir: " + error.message);
      return;
    }
    setComercios((prev) => prev.filter((c) => c.id !== id));
  }

  if (comercios.length === 0) {
    return <p className="text-sm text-neutral-400">Nenhum hotel ou restaurante cadastrado ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {comercios.map((c) => {
        const Icon = c.tipo === "hotel" ? Hotel : Utensils;
        return (
          <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                {c.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.foto_url} alt={c.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-400">
                    <Icon size={20} />
                  </div>
                )}
              </div>
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <Icon size={15} className="text-amber-700 dark:text-amber-500" />
                  {c.nome}
                  {!c.ativo && (
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      inativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500">
                  {TIPO_COMERCIO_LABELS[c.tipo] ?? c.tipo}
                  {c.cidade ? ` — ${c.cidade}` : ""}
                  {kmSentidoLabel(c.km_referencia, c.sentido_pista) ? ` — ${kmSentidoLabel(c.km_referencia, c.sentido_pista)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => alternarAtivo(c.id, c.ativo)}
                disabled={processandoId === c.id}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                {c.ativo ? <EyeOff size={14} /> : <Eye size={14} />} {c.ativo ? "Desativar" : "Ativar"}
              </button>
              <Link
                href={`/admin/hospedagem/${c.id}/editar`}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                <Pencil size={14} /> Editar
              </Link>
              <button
                onClick={() => excluir(c.id, c.nome)}
                disabled={processandoId === c.id}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
