import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import RomariaPlusAdminClient, { type CompraComCertificado } from "./RomariaPlusAdminClient";

export default async function AdminRomariaPlusPage() {
  const supabase = await createClient();

  // RLS (compras_romaria_plus_select_admin, migration 21) já garante que só
  // administrador chega até aqui com dados de verdade.
  const { data } = await supabase
    .from("compras_romaria_plus")
    .select("*, certificados(nome_peregrino, codigo)")
    .eq("status", "pago")
    .order("pago_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Romaria Plus — fotos compradas</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Compras já pagas, com a foto e o modelo escolhidos pelo peregrino para
        a arte da Romaria Plus (cada compra vale só para o ano da própria
        peregrinação). É possível baixar a foto original ou substituí-la —
        por exemplo, se for inadequada ou de baixa qualidade.
      </p>
      <RomariaPlusAdminClient comprasIniciais={(data ?? []) as CompraComCertificado[]} />
    </div>
  );
}
