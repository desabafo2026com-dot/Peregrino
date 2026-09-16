"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import ComercioForm, { type ComercioFormDados } from "@/components/ComercioForm";
import type { PontoComercial } from "@/types/database";

export default function EditarComercioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [comercio, setComercio] = useState<PontoComercial | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pontos_comerciais")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setComercio(data as PontoComercial | null));
  }, [id]);

  async function salvar(dados: ComercioFormDados) {
    const supabase = createClient();
    const { error } = await supabase.from("pontos_comerciais").update(dados).eq("id", id);
    if (error) return { error: error.message };
    router.push("/admin/hospedagem");
    router.refresh();
    return {};
  }

  if (comercio === undefined) {
    return <p className="text-sm text-neutral-400">Carregando...</p>;
  }

  if (comercio === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin/hospedagem" />
        <p className="text-neutral-500">Estabelecimento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin/hospedagem" />
      <h2 className="mb-1 text-xl font-bold">Editar hotel ou restaurante</h2>
      <p className="mb-6 text-sm text-neutral-500">Altere os dados deste estabelecimento.</p>
      <ComercioForm
        comercioInicial={comercio}
        onSalvar={salvar}
        submitLabel="Salvar alterações"
        submitLoadingLabel="Salvando..."
      />
    </div>
  );
}
