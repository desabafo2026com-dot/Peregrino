import { createClient } from "@/lib/supabase/server";
import GerentesAdminClient from "./GerentesAdminClient";
import VoltarButton from "@/components/VoltarButton";
import type { GerentePap } from "@/types/database";

export default async function AdminGerentesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gerentes_pap")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Gerentes de PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Aprove ou rejeite cadastros de gerentes de PAP. Só gerentes aprovados
        conseguem cadastrar pontos de apoio.
      </p>
      <GerentesAdminClient gerentesIniciais={(data ?? []) as GerentePap[]} />
    </div>
  );
}
