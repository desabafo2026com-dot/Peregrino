import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROMARIA_PLUS_EXTRA_FOTOS_VALOR_CENTAVOS, ROMARIA_PLUS_FOTOS_POR_PACOTE } from "@/lib/constants";
import type { CompraRomariaPlus } from "@/types/database";

// Cria uma preferência de pagamento para um PACOTE EXTRA de +5 fotos da
// Romaria Plus (Rodada 30, a pedido do usuário) — só pode ser comprado por
// quem já pagou a compra "inicial" (Certificado Plus) e já preencheu todos
// os slots de foto liberados até agora. A galeria continua sendo a mesma
// (romaria_plus_fotos.compra_id aponta para a compra INICIAL, nunca para a
// compra do pacote extra) — o pacote extra só amplia o limite de índices
// permitido, validado de novo (server-side) dentro de
// salvar_foto_romaria_plus_slot no banco.
export async function POST(request: NextRequest) {
  const { compraId } = (await request.json().catch(() => ({}))) as { compraId?: string };
  if (!compraId) {
    return NextResponse.json({ erro: "compraId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "É preciso estar logado." }, { status: 401 });
  }

  // RLS garante que só volta se a compra for do próprio usuário.
  const { data: compraInicial } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .eq("id", compraId)
    .eq("user_id", user.id)
    .eq("tipo", "inicial")
    .eq("status", "pago")
    .maybeSingle();

  if (!compraInicial) {
    return NextResponse.json(
      { erro: "Compra da Romaria Plus não encontrada, ou ainda não paga." },
      { status: 404 }
    );
  }

  const cert = compraInicial as CompraRomariaPlus;

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

  // Confere de novo no servidor se a galeria já está realmente cheia — a
  // mesma regra que esconde o botão na tela, só que aqui é o que decide de
  // verdade se a compra pode ser criada (o cliente nunca é confiável
  // sozinho para isso).
  const { count: pacotesExtraPagos } = await admin
    .from("compras_romaria_plus")
    .select("id", { count: "exact", head: true })
    .eq("compra_pai_id", compraId)
    .eq("tipo", "extra")
    .eq("status", "pago");

  const maxAtual = ROMARIA_PLUS_FOTOS_POR_PACOTE + ROMARIA_PLUS_FOTOS_POR_PACOTE * (pacotesExtraPagos ?? 0);

  const { count: fotosExistentes } = await admin
    .from("romaria_plus_fotos")
    .select("id", { count: "exact", head: true })
    .eq("compra_id", compraId);

  if ((fotosExistentes ?? 0) < maxAtual) {
    return NextResponse.json(
      { erro: `Ainda falta usar ${maxAtual - (fotosExistentes ?? 0)} foto(s) do pacote atual antes de comprar mais.` },
      { status: 400 }
    );
  }

  const { data: compraExtra, error: erroInsert } = await admin
    .from("compras_romaria_plus")
    .insert({
      certificado_id: cert.certificado_id,
      user_id: user.id,
      valor_centavos: ROMARIA_PLUS_EXTRA_FOTOS_VALOR_CENTAVOS,
      status: "pendente",
      ano: cert.ano,
      tipo: "extra",
      compra_pai_id: compraId,
    })
    .select()
    .single();

  if (erroInsert || !compraExtra) {
    return NextResponse.json({ erro: "Não foi possível iniciar a compra do pacote extra." }, { status: 500 });
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
            title: `Romaria Plus — pacote extra de +${ROMARIA_PLUS_FOTOS_POR_PACOTE} fotos`,
            description: `Compra ${compraId}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: ROMARIA_PLUS_EXTRA_FOTOS_VALOR_CENTAVOS / 100,
          },
        ],
        external_reference: compraExtra.id,
        notification_url: `${origin}/api/mercadopago/webhook`,
        back_urls: {
          success: `${origin}/certificado/plus/${cert.certificado_id}?romaria_plus_extra=retorno&compra=${compraExtra.id}`,
          pending: `${origin}/certificado/plus/${cert.certificado_id}?romaria_plus_extra=retorno&compra=${compraExtra.id}`,
          failure: `${origin}/certificado/plus/${cert.certificado_id}?romaria_plus_extra=retorno&compra=${compraExtra.id}`,
        },
        auto_return: "approved",
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      await admin.from("compras_romaria_plus").update({ status: "cancelado" }).eq("id", compraExtra.id);
      return NextResponse.json(
        { erro: "O Mercado Pago recusou a criação do pagamento.", detalhe },
        { status: 502 }
      );
    }

    const preferencia = (await resposta.json()) as { id: string; init_point: string };

    await admin
      .from("compras_romaria_plus")
      .update({ mp_preference_id: preferencia.id })
      .eq("id", compraExtra.id);

    return NextResponse.json({ initPoint: preferencia.init_point, compraId: compraExtra.id });
  } catch {
    await admin.from("compras_romaria_plus").update({ status: "cancelado" }).eq("id", compraExtra.id);
    return NextResponse.json({ erro: "Não foi possível falar com o Mercado Pago." }, { status: 502 });
  }
}
