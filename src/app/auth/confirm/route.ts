import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ConfirmType = "signup" | "recovery" | "invite" | "email_change" | "email" | "magiclink";

// Rota chamada pelo link de confirmação enviado por e-mail (cadastro,
// recuperação de senha, etc). O Supabase verifica o link no próprio
// domínio dele e redireciona para cá com `token_hash` + `type`; aqui
// confirmamos o token do lado do servidor (o que já cria a sessão via
// cookies) antes de mandar a pessoa para a página de sucesso.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as ConfirmType | null;
  const next = searchParams.get("next") ?? "/confirmado";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/confirmado?erro=1`);
}
