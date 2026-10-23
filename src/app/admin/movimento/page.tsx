import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import MovimentoCarregar from "./MovimentoCarregar";

// Rodada 80 — Pessoas por cidade: real (peregrinos com o app) e simulada
// (somando o resto do grupo de cada um), com escolha do dia e régua de
// horário. Exclusiva do administrador.
export default async function AdminMovimentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/movimento");

  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!perfil?.is_admin) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin" />
        <p className="text-neutral-500">Esta página é exclusiva do administrador.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <VoltarButton href="/admin" />
      <div>
        <h2 className="text-xl font-bold">Pessoas por cidade</h2>
        <p className="text-sm text-neutral-500">
          Quantas pessoas estavam em cada cidade num dia e horário. <strong>Real</strong>: só quem usa o app.{" "}
          <strong>Simulada</strong>: soma também o resto do grupo de cada peregrino.
        </p>
      </div>
      <MovimentoCarregar />
    </div>
  );
}
