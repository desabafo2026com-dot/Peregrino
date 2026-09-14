"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_GERENTE_LABELS } from "@/lib/constants";
import { CheckCircle2, XCircle, Clock, Search } from "lucide-react";
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
  papsPorGerente,
}: {
  gerentesIniciais: GerentePap[];
  papsPorGerente: Record<string, string[]>;
}) {
  const supabase = createClient();
  const [gerentes, setGerentes] = useState(gerentesIniciais);
  const [busca, setBusca] = useState("");

  const gerentesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return gerentes;
    return gerentes.filter((g) => {
      const papsDoGerente = (papsPorGerente[g.id] ?? []).join(" ").toLowerCase();
      return (
        g.nome_completo.toLowerCase().includes(termo) ||
        g.telefone.toLowerCase().includes(termo) ||
        (g.nome_organizacao ?? "").toLowerCase().includes(termo) ||
        papsDoGerente.includes(termo)
      );
    });
  }, [gerentes, busca, papsPorGerente]);

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
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          className="input pl-9"
          placeholder="Buscar por nome, telefone, organização ou PAP vinculado..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        {gerentesFiltrados.map((g) => {
          const Icon = STATUS_ICON[g.status];
          const papsDoGerente = papsPorGerente[g.id] ?? [];
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
                {papsDoGerente.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    PAP: {papsDoGerente.join(", ")}
                  </p>
                )}
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
        {gerentesFiltrados.length === 0 && (
          <p className="text-sm text-neutral-400">
            {gerentes.length === 0
              ? "Nenhum gerente de PAP cadastrado ainda."
              : "Nenhum gerente encontrado para essa busca."}
          </p>
        )}
      </div>
    </div>
  );
}
