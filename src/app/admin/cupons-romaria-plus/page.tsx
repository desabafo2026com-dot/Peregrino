import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import CuponsRomariaPlusClient from "./CuponsRomariaPlusClient";
import type { CupomRomariaPlus } from "@/types/database";

export default async function AdminCuponsRomariaPlusPage() {
  const supabase = await createClient();

  // RLS (cupons_romaria_plus_select_admin, migration 22) já garante que só
  // administrador chega até aqui com dados de verdade.
  const { data } = await supabase
    .from("cupons_romaria_plus")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Cupons da Romaria Plus</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Gere códigos para distribuir a peregrinos — cada código dá direito a
        uma Romaria Plus gratuita (Certificado Plus + editor de foto), sem
        passar pelo Mercado Pago. O peregrino digita o código na própria
        página do certificado, em &quot;Tenho um cupom&quot;.
      </p>
      <CuponsRomariaPlusClient cuponsIniciais={(data ?? []) as CupomRomariaPlus[]} />
    </div>
  );
}
