"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NIVEL_RISCO_LABELS, SENTIDO_KM_ABREV, nomeRota } from "@/lib/constants";
import { TriangleAlert, Pencil, Trash2 } from "lucide-react";
import type { PontoRisco, Rota } from "@/types/database";

function kmSentidoLabel(km: number | null, sentido: string | null) {
  if (km == null) return null;
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

function riscoColor(nivel: number) {
  if (nivel >= 4) return "text-red-700 dark:text-red-400";
  if (nivel === 3) return "text-amber-700 dark:text-amber-500";
  return "text-green-700 dark:text-green-400";
}

export default function RiscosAdminClient({
  riscosIniciais,
  rotas,
}: {
  riscosIniciais: PontoRisco[];
  rotas: Rota[];
}) {
  const [riscos, setRiscos] = useState(riscosIniciais);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const nomeDaRota = new Map(rotas.map((r) => [r.id, nomeRota(r)]));

  async function excluir(id: string) {
    if (
      !confirm(
        "Excluir este local de risco? Ele deixa de aparecer no mapa e na lista de rotas para todos os peregrinos."
      )
    )
      return;
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("pontos_risco").delete().eq("id", id);
    setExcluindoId(null);
    if (error) {
      alert("Não foi possível excluir: " + error.message);
      return;
    }
    setRiscos((prev) => prev.filter((r) => r.id !== id));
  }

  if (riscos.length === 0) {
    return <p className="text-sm text-neutral-400">Nenhum local de risco cadastrado ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {riscos.map((r) => (
        <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
              {r.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.foto_url} alt={r.titulo} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  <TriangleAlert size={20} />
                </div>
              )}
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <TriangleAlert size={15} className="text-red-600" />
                {r.titulo}
              </p>
              <p className="text-xs text-neutral-500">
                {kmSentidoLabel(r.km_referencia, r.sentido) ?? "km não informado"}
                {" — BR-"}
                {r.br}
                {r.rota_id ? ` — ${nomeDaRota.get(r.rota_id) ?? "rota"}` : " — ambas as rotas"}
              </p>
              <p className={`text-xs font-medium ${riscoColor(r.nivel_risco)}`}>
                Nível {r.nivel_risco}/5 — {NIVEL_RISCO_LABELS[r.nivel_risco]}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/riscos/${r.id}/editar`}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <Pencil size={14} /> Editar
            </Link>
            <button
              onClick={() => excluir(r.id)}
              disabled={excluindoId === r.id}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 size={14} /> {excluindoId === r.id ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
