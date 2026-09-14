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
    const termo = busca
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    if (!termo) return itens.slice(0, 30);
    return itens
      .filter((i) =>
        `${i.nome} ${i.cidade ?? ""}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .includes(termo)
      )
      .slice(0, 30);
  }, [itens, busca]);

  return (
    <div className="card">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
        <MapPinPlus size={20} /> Seu PAP já está nesta lista?
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        Reunimos {itens.length > 0 ? itens.length : "uma"} PAPs de uma lista pública
        de pontos de apoio da romaria. Se o seu já está aqui, selecione para
        aproveitar os dados (nome, cidade, km) e só completar o resto.
      </p>

      <div className="relative mb-3">
        <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          className="input pl-9"
          placeholder="Buscar por nome ou cidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Carregando...</p>
      ) : (
        <div className="mb-4 flex max-h-72 flex-col gap-1 overflow-y-auto">
          {filtrados.length === 0 && (
            <p className="py-3 text-center text-sm text-neutral-400">
              Nenhum resultado — pode cadastrar do zero abaixo.
            </p>
          )}
          {filtrados.map((item) => (
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
                  {item.sentido_pista && ` (${SENTIDO_PISTA_LABELS[item.sentido_pista]})`}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-amber-700">Usar este</span>
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={onPular} className="btn-secondary w-full">
        Não está na lista — cadastrar do zero
      </button>
    </div>
  );
}
