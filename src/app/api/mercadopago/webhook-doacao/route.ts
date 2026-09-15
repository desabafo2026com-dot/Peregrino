import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook do Mercado Pago para doações — mesmo princípio de segurança do
// webhook da Romaria Plus (src/app/api/mercadopago/webhook/route.ts):
// nunca confia no status que vem no corpo da notificação, sempre confirma
// consultando o pagamento de verdade direto na API do Mercado Pago.
// Webhook separado (em vez de reaproveitar o mesmo endpoint) para manter as
// duas tabelas (compras_romaria_plus / doacoes) completamente isoladas.
export async function POST(request: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json().catch(() => null)) as
    | { type?: string; action?: string; data?: { id?: string } }
    | null;
  const { searchParams } = new URL(request.url);

  const tipo = body?.type ?? searchParams.get("topic");
  const paymentId = body?.data?.id ?? searchParams.get("id");

  if (tipo !== "payment" || !paymentId) {
    return NextResponse.json({ ok: true });
  }

  let pagamento: { status: string; external_reference: string | null; id: number };
  try {
    const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resposta.ok) {
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
          : null;

  if (!novoStatus) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  await admin
    .from("doacoes")
    .update({
      status: novoStatus,
      mp_payment_id: String(pagamento.id),
      ...(novoStatus === "pago" ? { pago_em: new Date().toISOString() } : {}),
    })
    .eq("id", pagamento.external_reference);

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
