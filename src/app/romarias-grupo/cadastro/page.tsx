import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import RomariaGrupoForm from "./RomariaGrupoForm";
import type { RomariaGrupo } from "@/types/database";

// Cadastro de Romaria de Peregrinos (Rodada 24, renomeado de "Romaria em
// Grupo" na Rodada 27, a pedido do usuário) — puramente informativo (nome
// do grupo, cidade de origem, quantidade de pessoas, data de início e
// previsão de dias), para que autoridades e outros peregrinos saibam de
// uma caravana em trânsito. Exige estar logado (o mesmo "com perfil de
// peregrino também" do pedido original) — mas não exige ter uma
// peregrinação individual planejada, é um cadastro à parte.
export default async function RomariaGrupoCadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?tipo=peregrino&redirect=/romarias-grupo/cadastro");
  }

  const { data: minhasRomarias } = await supabase
    .from("romarias_grupo")
    .select("*")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">Cadastrar minha Romaria de Peregrinos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Vai em caravana ou grupo? Cadastre aqui para que autoridades e outros peregrinos saibam do
        seu grupo na estrada. <strong>Essas informações serão públicas</strong> assim que a
        administração aprovar o cadastro — nome do organizador e telefone só aparecem se você
        autorizar.
      </p>
      <RomariaGrupoForm userId={user.id} minhasRomariasIniciais={(minhasRomarias ?? []) as RomariaGrupo[]} />
    </div>
  );
}
