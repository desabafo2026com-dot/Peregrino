import { createClient } from "@/lib/supabase/server";
import PapAdminClient from "./PapAdminClient";
import VoltarButton from "@/components/VoltarButton";
import type { PontoApoio } from "@/types/database";

export default async function AdminPapPage() {
  const supabase = await createClient();
  const { data: pontos } = await supabase
    .from("pontos_apoio")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">PAP cadastrados por gerentes</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Aprove a divulgação no mapa público, ou rejeite. PAP pendentes não
        aparecem no mapa até serem aprovados.
      </p>
      <PapAdminClient pontosIniciais={(pontos ?? []) as PontoApoio[]} />
    </div>
  );
}
