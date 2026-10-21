"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Search, MapPinned, MapPin, CheckCircle2, CalendarDays, Pencil, CopyPlus, Loader2 } from "lucide-react";
import { SENTIDO_PISTA_LABELS } from "@/lib/constants";
import type { PapPreCadastro } from "@/types/database";

export default function PreCadastroAdminClient({ itensIniciais }: { itensIniciais: PapPreCadastro[] }) {
  const [busca, setBusca] = useState("");
  const router = useRouter();
  const [copiando, setCopiando] = useState(false);
  const [resultadoCopia, setResultadoCopia] = useState<string | null>(null);

  // Rodada 79 — atalho para o ano seguinte: em todos os PAPs sem gerente que
  // têm datas no ano mais recente e nenhuma no ano seguinte, repete os
  // mesmos dias/meses. Não apaga nada; dá para ajustar um a um depois.
  const anoBase = useMemo(() => {
    const anos = itensIniciais.flatMap((i) => (i.datas_funcionamento ?? []).map((d) => Number(d.slice(0, 4))));
    return anos.length ? Math.max(...anos) : null;
  }, [itensIniciais]);
  const candidatosCopia = useMemo(
    () =>
      anoBase == null
        ? []
        : itensIniciais.filter(
            (i) =>
              !i.reivindicado_por &&
              (i.datas_funcionamento ?? []).some((d) => d.startsWith(`${anoBase}-`)) &&
              !(i.datas_funcionamento ?? []).some((d) => d.startsWith(`${anoBase + 1}-`))
          ),
    [itensIniciais, anoBase]
  );

  async function copiarParaAnoSeguinte() {
    if (anoBase == null || candidatosCopia.length === 0) return;
    if (
      !confirm(
        `Repetir em ${anoBase + 1} os mesmos dias de ${anoBase} em ${candidatosCopia.length} PAP(s) sem gerente? As datas de ${anoBase} continuam; depois dá para ajustar cada PAP em "Editar".`
      )
    )
      return;
    setCopiando(true);
    setResultadoCopia(null);
    const supabase = createClient();
    let ok = 0;
    let falhas = 0;
    for (const item of candidatosCopia) {
      const atuais = item.datas_funcionamento ?? [];
      const novas = atuais
        .filter((d) => d.startsWith(`${anoBase}-`))
        .map((d) => `${anoBase + 1}${d.slice(4)}`)
        .filter((d) => !d.endsWith("-02-29"));
      const { error } = await supabase
        .from("paps_pre_cadastro")
        .update({ datas_funcionamento: [...new Set([...atuais, ...novas])].sort() })
        .eq("id", item.id);
      if (error) falhas++;
      else ok++;
    }
    setCopiando(false);
    setResultadoCopia(
      `${ok} PAP(s) com as datas de ${anoBase + 1} marcadas${falhas ? `; ${falhas} não foram salvos (tente de novo)` : ""}.`
    );
    router.refresh();
  }

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
      {anoBase != null && (
        <div className="card flex flex-col gap-2 border-amber-200 dark:border-amber-900">
          <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
            <strong>Datas do próximo ano:</strong> {candidatosCopia.length} PAP(s) sem gerente têm datas em {anoBase} e
            nenhuma em {anoBase + 1}.
          </p>
          {candidatosCopia.length > 0 && (
            <button
              type="button"
              onClick={copiarParaAnoSeguinte}
              disabled={copiando}
              className="btn-secondary flex w-fit items-center gap-2 text-sm"
            >
              {copiando ? <Loader2 size={16} className="animate-spin" /> : <CopyPlus size={16} />}
              Repetir em {anoBase + 1} os mesmos dias de {anoBase} (todos)
            </button>
          )}
          {resultadoCopia && <p className="text-sm text-green-700 dark:text-green-400">{resultadoCopia}</p>}
        </div>
      )}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          className="input input-com-icone"
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
                {/* Rodada 78 — editar os dados do PAP ainda sem gerente. */}
                {!item.reivindicado_por && (
                  <Link
                    href={`/admin/pap/pre-cadastro/${item.id}/editar`}
                    className="flex items-center gap-1 rounded-lg border border-amber-300 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    <Pencil size={14} /> Editar
                  </Link>
                )}
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
