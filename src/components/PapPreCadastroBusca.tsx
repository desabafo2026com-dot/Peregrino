"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, MapPinPlus } from "lucide-react";
import { SENTIDO_PISTA_LABELS } from "@/lib/constants";
import type { PapPreCadastro } from "@/types/database";

// Busca na base pública de PAPs reais (pré-cadastrados a partir de uma
// reportagem, sem gerente vinculado ainda) para o gerente encontrar o seu
// PAP e reaproveitar os dados, em vez de digitar tudo de novo.
export default function PapPreCadastroBusca({
  onSelecionar,
  onPular,
}: {
  onSelecionar: (item: PapPreCadastro) => void;
  onPular: () => void;
}) {
  const [itens, setItens] = useState<PapPreCadastro[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("paps_pre_cadastro")
      .select("*")
      .is("reivindicado_por", null)
      .order("cidade")
      .then(({ data }) => {
        setItens((data ?? []) as PapPreCadastro[]);
        setLoading(false);
      });
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    // Rodada 45 — antes mostrava só os 30 primeiros (sem busca) ou os 30
    // primeiros resultados, e isso passava a impressão de que o PAP da
    // pessoa não estava na lista (relato do usuário). Agora lista todos,
    // agrupados por cidade; a busca só filtra.
    if (!termo) return itens;
    return itens.filter((i) =>
      `${i.nome} ${i.cidade ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .includes(termo),
    );
  }, [itens, busca]);

  // Agrupa por cidade (a consulta já vem ordenada por cidade) para ficar
  // fácil de achar o seu rolando a lista.
  const grupos = useMemo(() => {
    const mapa = new Map<string, PapPreCadastro[]>();
    for (const item of filtrados) {
      const cidade = item.cidade ?? "Cidade não informada";
      const lista = mapa.get(cidade) ?? [];
      lista.push(item);
      mapa.set(cidade, lista);
    }
    return Array.from(mapa.entries());
  }, [filtrados]);

  return (
    <div className="card">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
        <MapPinPlus size={20} /> Seu PAP já está nesta lista?
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        Reunimos {itens.length > 0 ? itens.length : "uma"} PAPs de uma lista
        pública de pontos de apoio da romaria. Se o seu já está aqui, selecione
        para aproveitar os dados (nome, cidade, km) e só completar o resto.
      </p>

      <div className="relative mb-3">
        <Search
          className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          size={16}
        />
        <input
          className="input input-com-icone"
          placeholder="Buscar por nome ou cidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Carregando...</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-neutral-500">
            {busca.trim()
              ? `${filtrados.length} PAP encontrado${filtrados.length === 1 ? "" : "s"}.`
              : `Mostrando todos os ${itens.length} PAP da lista, por cidade — role a lista para ver todos, ou busque pelo nome ou cidade.`}
          </p>
          <div className="mb-4 flex max-h-[60vh] flex-col gap-1 overflow-y-auto rounded-lg border border-neutral-100 p-1 dark:border-neutral-800">
            {filtrados.length === 0 && (
              <p className="py-3 text-center text-sm text-neutral-400">
                Nenhum resultado — pode cadastrar do zero abaixo.
              </p>
            )}
            {grupos.map(([cidade, lista]) => (
              <div key={cidade} className="flex flex-col gap-1">
                <p className="sticky top-0 z-10 bg-white/95 px-1 pt-2 pb-1 text-xs font-bold uppercase tracking-wide text-amber-800 dark:bg-neutral-900/95 dark:text-amber-500">
                  {cidade} ({lista.length})
                </p>
                {lista.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelecionar(item)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-amber-400 dark:border-neutral-800"
                  >
                    <span>
                      <span className="block font-medium">{item.nome}</span>
                      <span className="block text-xs text-neutral-500">
                        {item.cidade ?? "Cidade não informada"}
                        {item.km != null && ` — BR-${item.br} km ${item.km}`}
                        {item.sentido_pista &&
                          ` (${SENTIDO_PISTA_LABELS[item.sentido_pista]})`}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-500">
                      Usar este
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <button type="button" onClick={onPular} className="btn-secondary w-full">
        Não está na lista — cadastrar do zero
      </button>
    </div>
  );
}
