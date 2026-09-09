"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_GERENTE_LABELS } from "@/lib/constants";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { GerentePap } from "@/types/database";

const STATUS_ICON: Record<string, React.ElementType> = {
  pendente: Clock,
  aprovado: CheckCircle2,
  rejeitado: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "text-amber-700",
  aprovado: "text-green-700",
  rejeitado: "text-red-700",
};

export default function GerentesAdminClient({
  gerentesIniciais,
}: {
  gerentesIniciais: GerentePap[];
}) {
  const supabase = createClient();
  const [gerentes, setGerentes] = useState(gerentesIniciais);

  async function atualizarStatus(id: string, status: "aprovado" | "rejeitado") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("gerentes_pap")
      .update({ status, aprovado_por: user?.id, aprovado_em: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setGerentes((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {gerentes.map((g) => {
        const Icon = STATUS_ICON[g.status];
        return (
          <div key={g.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <Icon size={16} className={STATUS_COLOR[g.status]} />
                {g.nome_completo}
              </p>
              <p className="text-xs text-neutral-500">
                {g.telefone}
                {g.nome_organizacao ? ` — ${g.nome_organizacao}` : ""}
              </p>
              <p className={`text-xs font-medium ${STATUS_COLOR[g.status]}`}>
                {STATUS_GERENTE_LABELS[g.status]}
              </p>
            </div>
            {g.status === "pendente" && (
              <div className="flex gap-2">
                <button
                  onClick={() => atualizarStatus(g.id, "aprovado")}
                  className="btn-primary text-xs"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => atualizarStatus(g.id, "rejeitado")}
                  className="btn-secondary text-xs"
                >
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        );
      })}
      {gerentes.length === 0 && (
        <p className="text-sm text-neutral-400">Nenhum gerente de PAP cadastrado ainda.</p>
      )}
    </div>
  );
}
