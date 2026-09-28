"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import PapForm, { type PapFormDados } from "@/components/PapForm";
import PapQrCode from "@/components/PapQrCode";
import PapConflitoDialog from "@/components/PapConflitoDialog";
import { verificarPapDuplicado, type ConflitoPap } from "@/lib/pap-duplicidade";
import type { PontoApoio, PapPreCadastro } from "@/types/database";

export default function NovoPapGerentePage() {
  const router = useRouter();
  const [sucesso, setSucesso] = useState<PontoApoio | null>(null);
  // Rodada 38 — igual ao cadastro do primeiro PAP em GerentePapClient.tsx:
  // se a checagem encontrar um PAP já existente na lista pública ainda sem
  // gerente, oferecemos usar aqueles dados em vez de criar um duplicado.
  const [preCadastro, setPreCadastro] = useState<PapPreCadastro | null>(null);
  const [conflito, setConflito] = useState<ConflitoPap | null>(null);

  async function salvar(dados: PapFormDados) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (dados.pre_cadastro_id) {
      // Mesmo caminho de GerentePapClient.tsx: reivindicar o item na lista
      // pública antes de criar o PAP de verdade, para ele sair da busca de
      // quem ainda não tem gerente.
      const { error: erroReivindicar } = await supabase.rpc("reivindicar_pap_pre_cadastro", {
        p_id: dados.pre_cadastro_id,
      });
      if (erroReivindicar) {
        return {
          error:
            "Este PAP da lista pública já foi vinculado por outra pessoa. Volte e escolha outro, ou cadastre do zero.",
        };
      }
    } else {
      const conflitoDetectado = await verificarPapDuplicado(
        supabase,
        dados.nome,
        dados.cidade,
        user!.id
      );
      if (conflitoDetectado) {
        setConflito(conflitoDetectado);
        return {};
      }
    }

    const { data, error } = await supabase
      .from("pontos_apoio")
      .insert({
        criado_por: user?.id,
        gerente_id: user?.id,
        ...dados,
        status_aprovacao: "pendente",
      })
      .select()
      .single();

    if (error) return { error: error.message };
    setSucesso(data as PontoApoio);
    return {};
  }

  if (sucesso) {
    const origem = typeof window !== "undefined" ? window.location.origin : "";
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="card flex flex-col items-center gap-2 border-green-200 bg-green-50 text-center dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="text-green-600" size={32} />
          <h2 className="text-lg font-bold text-green-800 dark:text-green-400">
            PAP cadastrado com sucesso!
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Ele fica pendente até um administrador aprovar a divulgação no mapa. Enquanto isso,
            você já pode imprimir o cartaz com QR code abaixo e deixar pronto no local — assim que
            a divulgação for aprovada, o código passa a mostrar as informações do seu PAP para
            qualquer peregrino que escanear.
          </p>
        </div>
        <PapQrCode ponto={sucesso} url={`${origem}/pap/${sucesso.id}`} />
        <button
          onClick={() => {
            router.push("/gerente-pap");
            router.refresh();
          }}
          className="btn-primary"
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/gerente-pap" />
      <h2 className="mb-1 text-xl font-bold">Cadastrar meu PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        PAP — Ponto de Apoio ao Peregrino. Preencha os dados e marque a
        localização exata no mapa para fixar o ponto. Ele fica pendente e só
        aparece no mapa para os peregrinos depois que um administrador
        aprovar a divulgação. Você pode alterar esses dados quando precisar.
      </p>
      {preCadastro && (
        <button
          type="button"
          onClick={() => setPreCadastro(null)}
          className="mb-4 text-xs font-medium text-amber-700 dark:text-amber-500"
        >
          ← Cadastrar sem aproveitar estes dados
        </button>
      )}
      <PapForm
        // Rodada 38: força remontar (ver GerentePapClient.tsx) quando "Usar
        // este PAP" preenche os campos a partir de um pré-cadastro depois
        // que o formulário já estava aberto.
        key={preCadastro?.id ?? "novo"}
        preCadastro={preCadastro}
        onSalvar={salvar}
        submitLabel="Cadastrar PAP"
        submitLoadingLabel="Salvando..."
      />
      {conflito && (
        <PapConflitoDialog
          conflito={conflito}
          onFechar={() => setConflito(null)}
          onUsarPreCadastro={(id) => {
            const item =
              conflito.tipo === "pre_cadastro" && conflito.preCadastro.id === id
                ? conflito.preCadastro
                : null;
            setConflito(null);
            if (item) setPreCadastro(item);
          }}
        />
      )}
    </div>
  );
}
