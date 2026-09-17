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

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Até a Rodada 22, uma conta de gerente de PAP sem perfil próprio de
  // peregrino era mandada direto de volta para "/gerente-pap" ao tentar
  // abrir o perfil — o que fazia sentido para "Editar perfil" de uma conta
  // só-gerente (não há nada de peregrino para editar), mas também bloqueava
  // por completo o único jeito de essa mesma conta completar um cadastro de
  // peregrino (ver ProfileForm logo abaixo, que já suporta perfilExistente
  // nulo — "Passo 2 de 2"). Rodada 23: o redirecionamento foi removido daqui
  // — quem chega em /perfil sem perfil de peregrino (gerente ou não) agora
  // vê a tela de completar cadastro, em vez de ser mandado de volta sem
  // conseguir nada. "Editar perfil" continua levando quem é só-gerente para
  // /gerente-pap (ver Navbar.tsx) — este redirecionamento nunca acontecia
  // por causa dele, e sim para quem chegava aqui por outro caminho (ex.: o
  // novo link em /gerente-pap para "fazer também minha peregrinação").
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
