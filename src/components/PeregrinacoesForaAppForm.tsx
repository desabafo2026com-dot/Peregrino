"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Rodada 66 — peregrinações feitas fora do app (antes de usar O Peregrino
// ou sem registrar nele). Informado pelo próprio peregrino UMA vez: depois
// de salvo não pode ser alterado (Migration 56). Entra no nível da
// credencial e nas medalhas de quantidade.
export function MensagemResponsabilidade({ destaque = false }: { destaque?: boolean }) {
  return (
    <div
      className={`flex gap-2 rounded-xl border p-3 text-sm ${
        destaque
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      <ShieldCheck size={20} className="mt-0.5 shrink-0" />
      <p style={{ textAlign: "left" }}>
        <strong>Quanto mais experiente o peregrino, maior a responsabilidade.</strong> Siga as regras de segurança
        e repasse-as aos peregrinos com menos experiência: seu exemplo no caminho protege vidas.{" "}
        <Link href="/rotas" className="font-semibold underline">
          Ver dicas de segurança
        </Link>
      </p>
    </div>
  );
}

export default function PeregrinacoesForaAppForm({
  valorInicial,
  onDeclarado,
}: {
  valorInicial: number | null;
  onDeclarado: (qtd: number) => void;
}) {
  const [valor, setValor] = useState<number | null>(valorInicial);
  const [digitado, setDigitado] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acabouDeSalvar, setAcabouDeSalvar] = useState(false);

  const qtd = digitado.trim() === "" ? null : Number(digitado);
  const valido = qtd != null && Number.isInteger(qtd) && qtd >= 0 && qtd <= 99;

  async function salvar() {
    if (!valido || qtd == null) return;
    setSalvando(true);
    setErro(null);
    const { error } = await createClient().rpc("declarar_peregrinacoes_fora_app", { p_qtd: qtd });
    setSalvando(false);
    if (error) {
      setErro(error.message || "Não foi possível salvar agora.");
      setConfirmando(false);
      return;
    }
    setValor(qtd);
    setAcabouDeSalvar(true);
    onDeclarado(qtd);
  }

  if (valor != null) {
    return (
      <div className="ml-6 flex flex-col gap-2">
        <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
          <Lock size={12} className="mr-1 inline align-[-1px]" />
          Peregrinações fora do app informadas por você: <strong>{valor}</strong> (não pode ser
          alterado)
        </p>
        <MensagemResponsabilidade destaque={acabouDeSalvar} />
      </div>
    );
  }

  return (
    <div className="ml-6 flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
      <p className="text-sm text-neutral-700 dark:text-neutral-300" style={{ textAlign: "left" }}>
        Já fez a peregrinação até Aparecida <strong>sem registrar no app</strong>? Informe quantas vezes, para
        somar ao seu nível.
      </p>
      <p className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400" style={{ textAlign: "left" }}>
        <Lock size={12} /> Depois de salvo, esse número não pode ser alterado.
      </p>
      {!confirmando ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            className="input w-24"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="0"
            aria-label="Quantas peregrinações fora do app"
          />
          <button type="button" className="btn-secondary" disabled={!valido} onClick={() => setConfirmando(true)}>
            Salvar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
          <p style={{ textAlign: "left" }}>
            Confirma <strong>{qtd}</strong> peregrinaç{qtd === 1 ? "ão" : "ões"} feita{qtd === 1 ? "" : "s"} fora do
            app? Você não poderá mudar depois.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Confirmar"}
            </button>
            <button type="button" className="btn-secondary" disabled={salvando} onClick={() => setConfirmando(false)}>
              Corrigir
            </button>
          </div>
        </div>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
