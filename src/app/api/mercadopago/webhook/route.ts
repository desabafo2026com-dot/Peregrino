import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook do Mercado Pago. IMPORTANTE: nunca confiamos no status que vem no
// corpo da notificação (qualquer um pode chamar esta URL forjando um
// payload) — usamos só o id do pagamento recebido para buscar o pagamento
// de verdade direto na API do Mercado Pago, com nosso access token, e é
// esse retorno (autenticado, do lado do servidor) que decide o que gravamos.
export async function POST(request: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    // Sem credencial configurada não há como validar nada — responde 200
    // mesmo assim para o Mercado Pago não ficar retentando uma notificação
    // que este ambiente não tem como processar.
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json().catch(() => null)) as
    | { type?: string; action?: string; data?: { id?: string } }
    | null;
  const { searchParams } = new URL(request.url);

  // Mercado Pago manda tanto o formato novo ({ type: "payment", data: { id }})
  // quanto, em integrações mais antigas, "topic"/"id" na query string.
  const tipo = body?.type ?? searchParams.get("topic");
  const paymentId = body?.data?.id ?? searchParams.get("id");

  if (tipo !== "payment" || !paymentId) {
    // Outras notificações (ex.: "merchant_order") não interessam aqui.
    return NextResponse.json({ ok: true });
  }

  let pagamento: { status: string; external_reference: string | null; id: number };
  try {
    const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resposta.ok) {
      // Erro do lado do Mercado Pago (ou id inválido) — pede pra tentar de
      // novo depois em vez de assumir qualquer coisa sobre o pagamento.
      return NextResponse.json({ erro: "Falha ao consultar o pagamento." }, { status: 502 });
    }
    pagamento = await resposta.json();
  } catch {
    return NextResponse.json({ erro: "Falha ao consultar o Mercado Pago." }, { status: 502 });
  }

  if (!pagamento.external_reference) {
    return NextResponse.json({ ok: true });
  }

  const novoStatus =
    pagamento.status === "approved"
      ? "pago"
      : pagamento.status === "refunded" || pagamento.status === "charged_back"
        ? "estornado"
        : pagamento.status === "rejected" || pagamento.status === "cancelled"
          ? "cancelado"
          : null; // pending / in_process / etc. — mantém "pendente"

  if (!novoStatus) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  await admin
    .from("compras_romaria_plus")
    .update({
      status: novoStatus,
      mp_payment_id: String(pagamento.id),
      ...(novoStatus === "pago" ? { pago_em: new Date().toISOString() } : {}),
    })
    .eq("id", pagamento.external_reference);

  return NextResponse.json({ ok: true });
}

// Algumas configurações antigas do Mercado Pago chamam a URL de notificação
// via GET (com "topic"/"id" na query) em vez de POST — tratamos igual.
export async function GET(request: NextRequest) {
  return POST(request);
}
