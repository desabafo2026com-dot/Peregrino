import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import TransferenciasAdminClient from "./TransferenciasAdminClient";
import type { PapTransferencia } from "@/types/database";

export default async function TransferenciasAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pap_transferencias")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin/pap" />
      <h2 className="mb-1 text-xl font-bold">Transferências de PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Pedidos de gerentes para assumir um PAP que já existe — de outro gerente, ou cadastrado
        pela administração sem gerente vinculado. Acompanhe, ou aceite/negue no lugar do gerente
        atual quando necessário.
      </p>
      <TransferenciasAdminClient itensIniciais={(data ?? []) as PapTransferencia[]} />
    </div>
  );
}
