import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PontosCheckinAdminClient from "./PontosCheckinAdminClient";
import type { PontoCheckin, Rota } from "@/types/database";

// Rodada 60 — posição de cada ponto de check-in de cidade. A pedido do
// usuário, o ponto deve ficar SOBRE a Via Dutra (algumas sedes, como
// Pindamonhangaba, ficam longe da rodovia), que é por onde o peregrino passa
// e onde o check-in automático acontece.
export default async function AdminCheckinsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/checkins");
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const [{ data: rotas }, { data: pontos }] = await Promise.all([
    supabase.from("rotas").select("*").order("ordem"),
    supabase.from("pontos_checkin").select("*").order("ordem"),
  ]);

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Pontos de check-in das cidades</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Escolha uma cidade e toque no mapa, sobre a Via Dutra, no lugar onde o peregrino passa por ela. É aí que o
        check-in automático acontece (até 8 km de distância) e onde o ponto aparece no mapa.
      </p>
      <PontosCheckinAdminClient rotas={(rotas ?? []) as Rota[]} pontosIniciais={(pontos ?? []) as PontoCheckin[]} />
    </div>
  );
}
