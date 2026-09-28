"use client";

import { useState } from "react";
import { AlertTriangle, MapPinned } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ConflitoPap } from "@/lib/pap-duplicidade";

// Rodada 38 — modal exibido ao tentar cadastrar um PAP "do zero" (fora da
// busca na lista pública) cujo nome+cidade já existem. Três variações,
// conforme o conflito encontrado (ver ConflitoPap em pap-duplicidade.ts):
//  - "vinculado": já tem gerente responsável -> pede "OK" ou "Reivindicar"
//    (cria um pedido de transferência para o gerente atual decidir).
//  - "sem_gerente": existe mas foi cadastrado pela administração, sem
//    gerente -> mesma ideia, mas o pedido só pode ser decidido pela
//    administração (não há quem aceitar do lado do gerente).
//  - "pre_cadastro": ainda está só na lista pública -> a saída é usar
//    esse item (mesmo caminho de PapPreCadastroBusca.onSelecionar), não
//    um pedido de transferência.
export default function PapConflitoDialog({
  conflito,
  onFechar,
  onUsarPreCadastro,
}: {
  conflito: ConflitoPap;
  onFechar: () => void;
  onUsarPreCadastro: (id: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function solicitarTransferencia(papId: string) {
    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("solicitar_transferencia_pap", { p_pap_id: papId });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="card max-w-sm text-center">
          <h3 className="mb-2 text-base font-bold text-green-700 dark:text-green-400">
            Solicitação enviada
          </h3>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
            Avisamos quem é responsável por decidir — assim que houver uma resposta, o PAP passa a
            aparecer para você (se aceita).
          </p>
          <button onClick={onFechar} className="btn-primary w-full">
            Entendi
          </button>
        </div>
      </div>
    );
  }

  const titulo =
    conflito.tipo === "vinculado"
      ? "Este PAP já foi vinculado a um gerente"
      : conflito.tipo === "sem_gerente"
        ? "Este PAP já existe"
        : "Este PAP já existe";

  const nome = conflito.tipo === "pre_cadastro" ? conflito.preCadastro.nome : conflito.pap.nome;
  const cidade =
    (conflito.tipo === "pre_cadastro" ? conflito.preCadastro.cidade : conflito.pap.cidade) ??
    "cidade não informada";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-w-sm">
        <div className="mb-3 flex items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={22} />
          <h3 className="text-base font-bold text-amber-800 dark:text-amber-500">{titulo}</h3>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
          <MapPinned size={16} className="shrink-0 text-neutral-500" />
          <span>
            <span className="font-medium">{nome}</span> — {cidade}
          </span>
        </div>

        {conflito.tipo === "vinculado" && (
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
            Já existe um PAP com esse nome vinculado a outro gerente. Se você acha que este PAP é
            seu, pode reivindicar — o gerente que fez o cadastro será avisado para aceitar ou
            negar.
          </p>
        )}
        {conflito.tipo === "sem_gerente" && (
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
            Já existe um PAP com esse nome, cadastrado pela administração e ainda sem gerente
            vinculado. Você pode solicitar para assumi-lo — a administração vai avaliar o pedido.
          </p>
        )}
        {conflito.tipo === "pre_cadastro" && (
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
            Já existe um PAP com esse nome na nossa lista pública, ainda sem gerente vinculado.
            Use-o para aproveitar os dados já cadastrados, em vez de criar um registro duplicado.
          </p>
        )}

        {erro && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {erro}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {conflito.tipo === "pre_cadastro" ? (
            <>
              <button
                onClick={() => onUsarPreCadastro(conflito.preCadastro.id)}
                className="btn-primary"
              >
                Usar este PAP
              </button>
              <button onClick={onFechar} className="btn-secondary">
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => solicitarTransferencia(conflito.pap.id)}
                disabled={enviando}
                className="btn-primary"
              >
                {enviando ? "Enviando..." : conflito.tipo === "vinculado" ? "Reivindicar" : "Solicitar vínculo"}
              </button>
              <button onClick={onFechar} className="btn-secondary">
                OK
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
