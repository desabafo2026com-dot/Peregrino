import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AvisosAdminClient, { type AvisoAdmin } from "./AvisosAdminClient";

// Rodada 45 — avisos da administração para todos os usuários (sininho no
// topo do app, ver components/AvisosGeraisSino.tsx). Só administradores.
export default async function AvisosAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  // Admin enxerga também os vencidos (política avisos_gerais_select_vigentes).
  const { data, error } = await supabase
    .from("avisos_gerais")
    .select("id, titulo, mensagem, criado_em, expira_em")
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-xl font-bold">Avisos para todos</h2>
      <p className="mb-6 text-sm text-neutral-500">
        O aviso aparece para todo mundo que abrir o app, com um sininho pulsando no topo da tela até
        a pessoa tocar e ler. Escolha por quanto tempo ele fica no ar, ou deixe fixo até você apagar.
      </p>
      {error ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Para usar os avisos, rode a <strong>Migration 40</strong> (arquivo peregrino_migration_40.sql)
          no SQL Editor do Supabase.
        </p>
      ) : (
        <AvisosAdminClient avisosIniciais={(data ?? []) as AvisoAdmin[]} />
      )}
    </div>
  );
}
