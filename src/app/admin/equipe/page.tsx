import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VoltarButton from "@/components/VoltarButton";
import EquipeAdminClient from "./EquipeAdminClient";
import type { Profile } from "@/types/database";

export default async function AdminEquipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Esta página é exclusiva de administradores (agentes não gerenciam a equipe).
  if (!perfil?.is_admin) redirect("/admin");

  const { data: equipe } = await supabase
    .from("profiles")
    .select("*")
    .or("is_admin.eq.true,is_agente.eq.true")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Equipe — administradores e agentes</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Cadastre novas contas de agente ou administrador, com e-mail e senha
        próprios. Agentes podem ver o painel e os mapas, e cadastrar trechos
        e locais de risco; administradores têm acesso completo.
      </p>
      <EquipeAdminClient equipeInicial={(equipe ?? []) as Profile[]} />
    </div>
  );
}
