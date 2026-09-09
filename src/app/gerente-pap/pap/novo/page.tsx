"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import PapForm, { type PapFormDados } from "@/components/PapForm";

export default function NovoPapGerentePage() {
  const router = useRouter();

  async function salvar(dados: PapFormDados) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("pontos_apoio").insert({
      criado_por: user?.id,
      gerente_id: user?.id,
      ...dados,
      status_aprovacao: "pendente",
    });

    if (error) return { error: error.message };
    router.push("/gerente-pap");
    router.refresh();
    return {};
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
