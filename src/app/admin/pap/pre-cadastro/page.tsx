import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PreCadastroAdminClient from "./PreCadastroAdminClient";
import type { PapPreCadastro } from "@/types/database";

export default async function PreCadastroAdminPage() {
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

  const { data: itens } = await supabase
    .from("paps_pre_cadastro")
    .select("*")
    .order("cidade");

  return (
    <div>
      <VoltarButton href="/admin/pap" />
      <h2 className="mb-1 text-xl font-bold">PAP pré-cadastrados — posição no mapa</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Lista pública de PAP reais que ainda não têm um gerente vinculado. Sem posição marcada,
        eles aparecem no mapa só pela aproximação da cidade — use &quot;Reposicionar&quot; para
        marcar o ponto exato.
      </p>
      <PreCadastroAdminClient itensIniciais={(itens ?? []) as PapPreCadastro[]} />
    </div>
  );
}
