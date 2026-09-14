"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import RiscoForm, { type RiscoFormDados } from "@/components/RiscoForm";
import type { PontoRisco } from "@/types/database";

export default function EditarRiscoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [risco, setRisco] = useState<PontoRisco | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pontos_risco")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setRisco(data as PontoRisco | null));
  }, [id]);

  async function salvar(dados: RiscoFormDados) {
    const supabase = createClient();
    const { error } = await supabase.from("pontos_risco").update(dados).eq("id", id);
    if (error) return { error: error.message };
    router.push("/admin/riscos");
    router.refresh();
    return {};
  }

  if (risco === undefined) {
    return <p className="text-sm text-neutral-400">Carregando...</p>;
  }

  if (risco === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin/riscos" />
        <p className="text-neutral-500">Ponto de risco não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin/riscos" />
      <h2 className="mb-1 text-xl font-bold">Editar local de risco</h2>
      <p className="mb-6 text-sm text-neutral-500">Altere os dados deste ponto de risco.</p>
      <RiscoForm
        riscoInicial={risco}
        onSalvar={salvar}
        submitLabel="Salvar alterações"
        submitLoadingLabel="Salvando..."
      />
    </div>
  );
}
