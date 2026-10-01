import { lerTipoConta } from "@/lib/tipo-conta";
import { caminhoInterno } from "@/lib/caminho-interno";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Rodada 40 — volta do "Entrar com o Google". O Google devolve a pessoa para
// cá com um `code`; trocamos esse código pela sessão (o que já grava os
// cookies de login) e decidimos para onde mandar a pessoa, com a mesma
// lógica do login por senha em /login (handleEntrar):
// - conta nova (nunca teve cadastro de peregrino nem de gerente, e nem
//   escolheu um tipo de conta): vai para /login/completar, onde escolhe
//   "peregrino" ou "gerente de PAP", confirma nome/telefone e aceita os
//   Termos — o mesmo aceite obrigatório do cadastro por e-mail;
// - conta que já existia: segue para o destino de sempre.
//
// Contas antigas criadas por e-mail com o mesmo endereço do Google são
// unidas automaticamente pelo Supabase (inclusive quem se cadastrou por
// e-mail e nunca clicou no link de confirmação) — os dados guardados no
// cadastro (tipo de conta, nome, telefone) continuam valendo.


export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tipoPreset = lerTipoConta(searchParams.get("tipo"));
  const redirectParam = caminhoInterno(searchParams.get("redirect"));

  // Sem código (ex.: a pessoa cancelou na tela do Google) ou código
  // inválido/expirado: volta para o login com um aviso.
  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=google`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=google`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?erro=google`);
  }

  const [{ data: gerente }, { data: perfil }] = await Promise.all([
    supabase.from("gerentes_pap").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
  ]);
  const tipoMetadata = user.user_metadata?.tipo_conta as string | undefined;

  if (!gerente && !perfil && !tipoMetadata) {
    const params = new URLSearchParams();
    if (tipoPreset) params.set("tipo", tipoPreset);
    if (redirectParam) params.set("redirect", redirectParam);
    const qs = params.toString();
    return NextResponse.redirect(`${origin}/login/completar${qs ? `?${qs}` : ""}`);
  }

  const ehGerente = !!gerente || tipoMetadata === "gerente_pap";
  let destino = redirectParam || "/painel";
  if (ehGerente) {
    destino = tipoPreset === "peregrino" && !perfil ? "/perfil" : "/gerente-pap";
  } else if (tipoPreset === "gerente_pap") {
    destino = "/gerente-pap/cadastro";
  } else if (tipoPreset === "organizador") {
    // Rodada 59 — "Sou organizador de Romaria" com conta que já existia.
    destino = "/romarias-grupo/cadastro";
  }
  return NextResponse.redirect(`${origin}${destino}`);
}
