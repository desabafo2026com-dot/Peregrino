"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPinned, MapPin, CheckCircle2, CalendarDays } from "lucide-react";
import { SENTIDO_PISTA_LABELS } from "@/lib/constants";
import type { PapPreCadastro } from "@/types/database";

export default function PreCadastroAdminClient({ itensIniciais }: { itensIniciais: PapPreCadastro[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!termo) return itensIniciais;
    return itensIniciais.filter((i) =>
      `${i.nome} ${i.cidade ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .includes(termo)
    );
  }, [itensIniciais, busca]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          className="input pl-9"
          placeholder="Buscar por nome ou cidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        {filtrados.map((item) => {
          const posicionado = item.latitude != null && item.longitude != null;
          return (
            <div key={item.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <MapPinned size={16} className="text-amber-700" />
                  {item.nome}
                </p>
                <p className="text-xs text-neutral-500">
                  {item.cidade ?? "Cidade não informada"}
                  {item.km != null && ` — BR-${item.br} km ${item.km}`}
                  {item.sentido_pista && ` (${SENTIDO_PISTA_LABELS[item.sentido_pista]})`}
                </p>
                <p className="text-xs text-neutral-500">
                  {item.reivindicado_por ? "Já vinculado a um gerente" : "Ainda sem gerente vinculado"}
                </p>
                {posicionado && (
                  <p className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 size={12} /> Posição exata marcada
                  </p>
                )}
                <p className="text-xs text-neutral-500">
                  {item.datas_funcionamento?.length
                    ? `${item.datas_funcionamento.length} data(s) marcada(s) no calendário`
                    : "Sem calendário marcado ainda"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={`/admin/pap/pre-cadastro/${item.id}/datas`}
                  className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  <CalendarDays size={14} /> Datas
                </Link>
                <Link
                  href={`/admin/pap/pre-cadastro/${item.id}/posicao`}
                  className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  <MapPin size={14} /> {posicionado ? "Reposicionar" : "Marcar posição"}
                </Link>
              </div>
            </div>
          );
        })}
        {filtrados.length === 0 && (
          <p className="text-sm text-neutral-400">Nenhum resultado.</p>
        )}
      </div>
    </div>
  );
}
