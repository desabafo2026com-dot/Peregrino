"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import PapForm, { type PapFormDados } from "@/components/PapForm";
import PapQrCode from "@/components/PapQrCode";
import type { PontoApoio } from "@/types/database";

export default function NovoPapGerentePage() {
  const router = useRouter();
  const [sucesso, setSucesso] = useState<PontoApoio | null>(null);

  async function salvar(dados: PapFormDados) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      <PapForm onSalvar={salvar} submitLabel="Cadastrar PAP" submitLoadingLabel="Salvando..." />
    </div>
  );
}
