"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import PapForm, { type PapFormDados } from "@/components/PapForm";

export default function NovoPapPage() {
  const router = useRouter();

  async function salvar(dados: PapFormDados) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("pontos_apoio").insert({
      criado_por: user?.id,
      ...dados,
      status_aprovacao: "aprovado",
    });

    if (error) return { error: error.message };
    router.push("/mapa");
    router.refresh();
    return {};
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Cadastrar PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        PAP — Ponto de Apoio ao Peregrino. Preencha os dados e marque a
        localização exata no mapa para fixar o ponto.
      </p>
      <PapForm onSalvar={salvar} submitLabel="Cadastrar PAP" submitLoadingLabel="Salvando..." />
    </div>
  );
}
