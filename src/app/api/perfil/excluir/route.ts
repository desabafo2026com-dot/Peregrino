import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Exclusão de conta (Rodada 24, pedido do usuário: "no perfil criar a
// opção de excluir perfil"). Só o próprio usuário logado pode apagar a
// própria conta — nunca recebe um id vindo do corpo da requisição, sempre
// usa o id da sessão autenticada no servidor.
//
// A exclusão é feita apagando o usuário direto em auth.users, via a chave
// de serviço (a mesma já usada nas rotas de pagamento, nunca exposta ao
// navegador) — como todo dado do usuário no schema referencia
// auth.users(id) com "on delete cascade" (profiles, peregrinacoes,
// checkins, certificados, compras/fotos da Romaria Plus, mensagens de
// contato, romarias_grupo etc.), isso já apaga em cascata tudo que é dono
// dele. A única exceção deliberada é um PAP que ele gerencia
// (pontos_apoio.gerente_id referencia gerentes_pap(id) com "on delete set
// null") — o ponto físico continua existindo para os demais peregrinos,
// só perde o vínculo com o gerente que saiu.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { erro: "Exclusão de conta indisponível no momento. Tente novamente mais tarde ou fale com o desenvolvedor." },
      { status: 500 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ erro: "Não foi possível excluir a conta agora. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
