import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOACAO_VALOR_MINIMO_CENTAVOS, DOACAO_VALOR_MAXIMO_CENTAVOS } from "@/lib/constants";

// Cria uma preferência de pagamento (Checkout Pro) no Mercado Pago para uma
// doação livre — sem exigir login, o valor vem digitado pela própria
// pessoa (validado aqui, dentro de limites, só contra erro de digitação).
export async function POST(request: NextRequest) {
  const { valorCentavos, nome } = (await request.json().catch(() => ({}))) as {
    valorCentavos?: number;
    nome?: string;
  };

  if (
    typeof valorCentavos !== "number" ||
    !Number.isFinite(valorCentavos) ||
    !Number.isInteger(valorCentavos) ||
    valorCentavos < DOACAO_VALOR_MINIMO_CENTAVOS ||
    valorCentavos > DOACAO_VALOR_MAXIMO_CENTAVOS
  ) {
    return NextResponse.json(
      {
        erro: `Informe um valor entre R$ ${(DOACAO_VALOR_MINIMO_CENTAVOS / 100).toFixed(2).replace(".", ",")} e R$ ${(DOACAO_VALOR_MAXIMO_CENTAVOS / 100).toFixed(2).replace(".", ",")}.`,
      },
      { status: 400 }
    );
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

  const { data: doacao, error: erroInsert } = await admin
    .from("doacoes")
    .insert({
      valor_centavos: valorCentavos,
      nome_doador: nome?.trim() || null,
      status: "pendente",
    })
    .select()
    .single();

  if (erroInsert || !doacao) {
    return NextResponse.json({ erro: "Não foi possível iniciar a doação." }, { status: 500 });
  }

  const { origin } = new URL(request.url);

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
            title: "Doação — App O Peregrino",
            description: "Ajuda a manter e continuar melhorando o app",
            quantity: 1,
            currency_id: "BRL",
            unit_price: valorCentavos / 100,
          },
        ],
        external_reference: doacao.id,
        // Webhook próprio (separado do da Romaria Plus) — evita qualquer
        // ambiguidade entre as duas tabelas ao processar a notificação.
        notification_url: `${origin}/api/mercadopago/webhook-doacao`,
        back_urls: {
          success: `${origin}/?doacao=retorno`,
          pending: `${origin}/?doacao=retorno`,
          failure: `${origin}/?doacao=retorno`,
        },
        auto_return: "approved",
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      await admin.from("doacoes").update({ status: "cancelado" }).eq("id", doacao.id);
      return NextResponse.json(
        { erro: "O Mercado Pago recusou a criação do pagamento.", detalhe },
        { status: 502 }
      );
    }

    const preferencia = (await resposta.json()) as { id: string; init_point: string };

    await admin.from("doacoes").update({ mp_preference_id: preferencia.id }).eq("id", doacao.id);

    return NextResponse.json({ initPoint: preferencia.init_point });
  } catch {
    await admin.from("doacoes").update({ status: "cancelado" }).eq("id", doacao.id);
    return NextResponse.json({ erro: "Não foi possível falar com o Mercado Pago." }, { status: 502 });
  }
}
