import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import EscolhaTipoConta from "@/components/EscolhaTipoConta";
import type { TipoConta } from "@/lib/tipo-conta";

export const metadata = {
  title: "Como você vai usar o app? — O Peregrino",
};

// Rodada 59 — porta de entrada única: "Sou peregrino", "PAP — vincular ou
// cadastrar" e "Sou organizador de Romaria" (home) trazem para cá. Todo
// mundo tem cadastro (para saber quem postou cada informação); gerente de
// PAP e organizador também recebem o perfil de peregrino.
export default async function CadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hrefs: Record<TipoConta, string> = {
    peregrino: "/login?tipo=peregrino",
    gerente_pap: "/login?tipo=gerente_pap",
    organizador: "/login?tipo=organizador",
  };

  if (user) {
    const { data: gerente } = await supabase.from("gerentes_pap").select("id").eq("id", user.id).maybeSingle();
    hrefs = {
      peregrino: "/painel",
      gerente_pap: gerente ? "/gerente-pap" : "/gerente-pap/cadastro",
      organizador: "/romarias-grupo/cadastro",
    };
  }

  return (
    <div className="mx-auto max-w-md">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">Como você vai usar o app?</h1>
      <p className="mb-5 text-sm text-neutral-500" style={{ textAlign: "left" }}>
        {user
          ? "Escolha o que você quer fazer agora."
          : "Escolha uma opção para entrar ou criar sua conta. O cadastro é igual para todos, e assim sabemos quem postou cada informação."}
      </p>
      <EscolhaTipoConta hrefs={hrefs} />
    </div>
  );
}
