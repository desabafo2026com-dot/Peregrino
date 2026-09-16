import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import AlterarSenhaForm from "@/components/AlterarSenhaForm";
import ContatoDesenvolvedorForm from "@/components/ContatoDesenvolvedorForm";
import VoltarButton from "@/components/VoltarButton";
import Link from "next/link";
import type { Profile, MensagemContato } from "@/types/database";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/perfil");
  }

  // Contas de Gerente de PAP têm sua própria área e nunca acessam o perfil
  // de peregrino.
  const { data: gerente } = await supabase
    .from("gerentes_pap")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (gerente || user.user_metadata?.tipo_conta === "gerente_pap") {
    redirect("/gerente-pap");
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: mensagens } = await supabase
    .from("mensagens_contato")
    .select("*")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  // "Completo" aqui significa a cidade já preenchida (o campo mais cedo do
  // formulário de perfil de peregrino) — não só a linha existir, já que
  // ela pode existir ainda vazia, com só o aceite dos termos gravado no
  // cadastro (ver registrar_aceite_termos, Rodada 19).
  const perfilCompleto = !!(perfil as Profile | null)?.cidade;

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">
        {perfilCompleto ? "Meu perfil" : "Complete seu cadastro"}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {perfilCompleto
          ? "Atualize suas informações quando precisar."
          : "Passo 2 de 2: conte um pouco sobre sua peregrinação."}
      </p>
      <ProfileForm
        userId={user.id}
        nomeInicial={(user.user_metadata?.nome_completo as string) ?? ""}
        telefoneInicial={(user.user_metadata?.telefone as string) ?? ""}
        aceitaCompartilharInicial={!!user.user_metadata?.aceita_termos}
        perfilExistente={perfil as Profile | null}
      />
      <div className="mt-6">
        <AlterarSenhaForm />
      </div>
      <div className="mt-6">
        <ContatoDesenvolvedorForm
          userId={user.id}
          mensagensIniciais={(mensagens ?? []) as MensagemContato[]}
        />
      </div>
      <p className="mt-8 text-center text-xs text-neutral-400">
        <Link href="/termos" className="underline">
          Termos de Uso
        </Link>{" "}
        ·{" "}
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>
      </p>
    </div>
  );
}
