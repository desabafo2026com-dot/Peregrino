"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MapPinPlus, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { GerentePap, PontoApoio } from "@/types/database";

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

  if (gerente.status === "pendente") {
    return (
      <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <Clock className="mt-0.5 text-amber-700" size={22} />
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Seu cadastro está aguardando aprovação de um administrador. Assim
          que for aprovado, você poderá cadastrar seu PAP aqui — ele
          aparecerá para todos os peregrinos no mapa.
        </p>
      </div>
    );
  }

  if (gerente.status === "rejeitado") {
    return (
      <div className="card flex items-start gap-3 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
        <XCircle className="mt-0.5 text-red-700" size={22} />
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          <p>Seu cadastro de Gerente de PAP não foi aprovado.</p>
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
      <div className="card flex items-center gap-3 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
        <CheckCircle2 className="text-green-700" size={22} />
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Cadastro aprovado! Seus PAP aparecem para todos os peregrinos no mapa.
        </p>
      </div>

      <Link href="/gerente-pap/pap/novo" className="btn-primary flex items-center justify-center gap-2">
        <MapPinPlus size={18} /> Cadastrar novo PAP
      </Link>

      <div className="flex flex-col gap-2">
        {pontos.map((p) => (
          <div key={p.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{p.nome}</p>
              <p className="text-xs text-neutral-500">
                {p.ativo ? "Ativo" : "Inativo"}
                {p.km_referencia != null ? ` — km ${p.km_referencia}` : ""}
              </p>
            </div>
            <button
              onClick={() => excluir(p.id)}
              className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              aria-label="Excluir PAP"
            >
              <Trash2 size={18} />
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
