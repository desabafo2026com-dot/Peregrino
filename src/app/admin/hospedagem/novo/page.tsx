"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import ComercioForm, { type ComercioFormDados } from "@/components/ComercioForm";

export default function NovoComercioPage() {
  const router = useRouter();

  async function salvar(dados: ComercioFormDados) {
    const supabase = createClient();
    const { error } = await supabase.from("pontos_comerciais").insert(dados);
    if (error) return { error: error.message };
    router.push("/admin/hospedagem");
    router.refresh();
    return {};
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin/hospedagem" />
      <h2 className="mb-1 text-xl font-bold">Cadastrar hotel ou restaurante</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Marque no mapa a localização exata do estabelecimento. Ele já aparece para os peregrinos
        assim que salvo (não passa por aprovação, diferente do cadastro de PAP).
      </p>
      <ComercioForm onSalvar={salvar} submitLabel="Cadastrar" submitLoadingLabel="Salvando..." />
    </div>
  );
}
