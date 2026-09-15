"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { GerentePap } from "@/types/database";

// A conta de gerente de PAP não passa mais por aprovação da administração
// (todo cadastro novo já nasce "aprovado" — decisão de produto confirmada
// pelo usuário; a única aprovação que continua existindo de verdade é a da
// divulgação de cada PAP no mapa, feita em /admin/pap). Esta tela é só uma
// lista de consulta, em tabela.
export default function GerentesAdminClient({
  gerentesIniciais,
  papsPorGerente,
}: {
  gerentesIniciais: GerentePap[];
  papsPorGerente: Record<string, string[]>;
}) {
  const [busca, setBusca] = useState("");

  const gerentesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return gerentesIniciais;
    return gerentesIniciais.filter((g) => {
      const papsDoGerente = (papsPorGerente[g.id] ?? []).join(" ").toLowerCase();
      return (
        g.nome_completo.toLowerCase().includes(termo) ||
        g.telefone.toLowerCase().includes(termo) ||
        (g.nome_organizacao ?? "").toLowerCase().includes(termo) ||
        papsDoGerente.includes(termo)
      );
    });
  }, [gerentesIniciais, busca, papsPorGerente]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          className="input pl-9"
          placeholder="Buscar por nome, telefone ou PAP vinculado..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-semibold">Nome</th>
              <th className="px-4 py-2 font-semibold">Telefone</th>
              <th className="px-4 py-2 font-semibold">PAP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {gerentesFiltrados.map((g) => {
              const papsDoGerente = papsPorGerente[g.id] ?? [];
              return (
                <tr key={g.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium">{g.nome_completo}</p>
                    {g.nome_organizacao && (
                      <p className="text-xs text-neutral-500">{g.nome_organizacao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-neutral-600 dark:text-neutral-300">
                    {g.telefone}
                  </td>
                  <td className="px-4 py-3 align-top text-neutral-600 dark:text-neutral-300">
                    {papsDoGerente.length > 0 ? papsDoGerente.join(", ") : "ainda sem PAP"}
                  </td>
                </tr>
              );
            })}
            {gerentesFiltrados.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-neutral-400">
                  {gerentesIniciais.length === 0
                    ? "Nenhum gerente de PAP cadastrado ainda."
                    : "Nenhum gerente encontrado para essa busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
