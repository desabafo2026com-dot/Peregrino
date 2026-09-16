import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import HospedagemClient from "./HospedagemClient";
import type { PontoComercial } from "@/types/database";

export default async function HospedagemPage() {
  const supabase = await createClient();
  const { data: comercios } = await supabase
    .from("pontos_comerciais")
    .select("*")
    .eq("ativo", true)
    .order("km_referencia", { ascending: true, nullsFirst: false });

  return (
    <div className="mx-auto max-w-3xl">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">Hotéis e Restaurantes</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Opções de hospedagem e alimentação ao longo da Rodovia Presidente Dutra, para completar sua
        peregrinação com mais conforto.
      </p>
      <HospedagemClient comercios={(comercios ?? []) as PontoComercial[]} />
    </div>
  );
}
