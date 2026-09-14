"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import RiscoForm, { type RiscoFormDados } from "@/components/RiscoForm";

export default function NovoRiscoPage() {
  const router = useRouter();

  async function salvar(dados: RiscoFormDados) {
    const supabase = createClient();
    const { error } = await supabase.from("pontos_risco").insert(dados);
    if (error) return { error: error.message };
    router.push("/rotas");
    router.refresh();
    return {};
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Cadastrar local de risco</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Marque no mapa um trecho específico de maior perigo para os
        peregrinos que caminham ou pedalam pela rodovia.
      </p>
      <RiscoForm onSalvar={salvar} submitLabel="Cadastrar local de risco" submitLoadingLabel="Salvando..." />
    </div>
  );
}
