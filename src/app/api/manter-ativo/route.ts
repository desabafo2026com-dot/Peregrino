import { NextResponse, type NextRequest } from "next/server";
import { createIsolatedClient } from "@/lib/supabase/isolatedClient";

// Rodada 76 — chamada pela Vercel a cada 5 dias (vercel.json, "crons").
// 1) Mantém o Supabase em uso: no plano grátis, o projeto é pausado depois
//    de 7 dias sem atividade.
// 2) Roda a manutenção (Migration 64): apaga posições paradas há mais de
//    30 dias e generaliza a posição exata dos check-ins antigos.
// Se a variável CRON_SECRET existir na Vercel, só aceita a chamada da
// própria Vercel (que manda esse segredo); sem ela, aceita qualquer uma —
// a manutenção é inofensiva.
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const supabase = createIsolatedClient();
  const { data, error } = await supabase.rpc("manutencao_rotina");
  if (error) {
    // Sem a Migration 64 ainda: pelo menos uma consulta simples, para contar
    // como atividade.
    const { error: erroSimples } = await supabase.from("rotas").select("id").limit(1);
    return NextResponse.json(
      { ok: !erroSimples, manutencao: null, aviso: "manutencao_rotina indisponível" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json({ ok: true, manutencao: data }, { headers: { "Cache-Control": "no-store" } });
}
