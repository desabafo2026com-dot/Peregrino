import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROMARIA_PLUS_VALOR_CENTAVOS } from "@/lib/constants";
import type { Certificado } from "@/types/database";

// Cria uma preferência de pagamento (Checkout Pro) no Mercado Pago para a
// compra da "Romaria Plus" referente a um certificado já emitido, e devolve
// a URL de checkout para o navegador redirecionar o usuário. O preço vem
// sempre desta constante do servidor — nunca de nada enviado pelo cliente.
export async function POST(request: NextRequest) {
  const { certificadoId } = (await request.json().catch(() => ({}))) as {
    certificadoId?: string;
  };
  if (!certificadoId) {
    return NextResponse.json({ erro: "certificadoId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  // RLS garante que só vem de volta se o certificado for do próprio usuário.
  const { data: certificado } = await supabase
    .from("certificados")
    .select("*")
    .eq("id", certificadoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!certificado) {
    return NextResponse.json({ erro: "Certificado não encontrado." }, { status: 404 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      {
        erro:
          "Pagamentos ainda não configurados neste ambiente (falta a credencial do Mercado Pago). Tente novamente mais tarde.",
      },
      { status: 501 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { erro: "Pagamentos ainda não configurados neste ambiente (falta a service role key)." },
      { status: 501 }
    );
  }

  const { data: compra, error: erroInsert } = await admin
    .from("compras_romaria_plus")
    .insert({
      certificado_id: certificadoId,
      user_id: user.id,
      valor_centavos: ROMARIA_PLUS_VALOR_CENTAVOS,
      status: "pendente",
    })
    .select()
    .single();

  if (erroInsert || !compra) {
    return NextResponse.json({ erro: "Não foi possível iniciar a compra." }, { status: 500 });
  }

  const { origin } = new URL(request.url);
  const cert = certificado as Certificado;

  try {
    const resposta = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: "Romaria Plus — arte personalizada da peregrinação",
            description: `Certificado ${cert.codigo} — ${cert.nome_peregrino}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: ROMARIA_PLUS_VALOR_CENTAVOS / 100,
          },
        ],
        external_reference: compra.id,
        notification_url: `${origin}/api/mercadopago/webhook`,
        back_urls: {
          success: `${origin}/certificado?romaria_plus=retorno&compra=${compra.id}`,
          pending: `${origin}/certificado?romaria_plus=retorno&compra=${compra.id}`,
          failure: `${origin}/certificado?romaria_plus=retorno&compra=${compra.id}`,
        },
        auto_return: "approved",
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      await admin.from("compras_romaria_plus").update({ status: "cancelado" }).eq("id", compra.id);
      return NextResponse.json(
        { erro: "O Mercado Pago recusou a criação do pagamento.", detalhe },
        { status: 502 }
      );
    }

    const preferencia = (await resposta.json()) as { id: string; init_point: string };

    await admin
      .from("compras_romaria_plus")
      .update({ mp_preference_id: preferencia.id })
      .eq("id", compra.id);

    return NextResponse.json({ initPoint: preferencia.init_point, compraId: compra.id });
  } catch {
    await admin.from("compras_romaria_plus").update({ status: "cancelado" }).eq("id", compra.id);
    return NextResponse.json({ erro: "Não foi possível falar com o Mercado Pago." }, { status: 502 });
  }
}
