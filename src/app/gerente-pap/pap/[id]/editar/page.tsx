"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import PapForm, { type PapFormDados } from "@/components/PapForm";
import type { PontoApoio } from "@/types/database";

export default function EditarPapGerentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ponto, setPonto] = useState<PontoApoio | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pontos_apoio")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPonto(data as PontoApoio | null));
  }, [id]);

  async function salvar(dados: PapFormDados) {
    const supabase = createClient();
    const { error } = await supabase.from("pontos_apoio").update(dados).eq("id", id);
    if (error) return { error: error.message };
    router.push("/gerente-pap");
    router.refresh();
    return {};
  }

  if (ponto === undefined) {
    return <p className="text-sm text-neutral-400">Carregando...</p>;
  }

  if (ponto === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/gerente-pap" />
        <p className="text-neutral-500">PAP não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/gerente-pap" />
      <h2 className="mb-1 text-xl font-bold">Editar meu PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Altere os dados do seu PAP. Se ele já estava aprovado, a alteração
        continua visível no mapa normalmente.
      </p>
      <PapForm
        pontoInicial={ponto}
        onSalvar={salvar}
        submitLabel="Salvar alterações"
        submitLoadingLabel="Salvando..."
      />
    </div>
  );
}
