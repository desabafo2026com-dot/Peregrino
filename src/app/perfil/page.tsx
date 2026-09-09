import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import type { Profile } from "@/types/database";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/perfil");
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">
        {perfil ? "Meu perfil" : "Complete seu cadastro"}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {perfil
          ? "Atualize suas informações quando precisar."
          : "Passo 2 de 2: conte um pouco sobre sua peregrinação."}
      </p>
      <ProfileForm
        userId={user.id}
        nomeInicial={(user.user_metadata?.nome_completo as string) ?? ""}
        telefoneInicial={(user.user_metadata?.telefone as string) ?? ""}
        perfilExistente={perfil as Profile | null}
      />
    </div>
  );
}
