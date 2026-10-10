import type { SupabaseClient } from "@supabase/supabase-js";
import type { DadosConquistas } from "@/lib/conquistas";

// Rodada 65 — junta, do próprio usuário, os dados usados pelo nível e pelas
// medalhas (ver lib/conquistas.ts). Consultas leves e em paralelo.
export async function carregarDadosConquistas(supabase: SupabaseClient, userId: string): Promise<DadosConquistas> {
  const [certs, peregs, avisos, compras, mensagem, intencao, agradecimento] = await Promise.all([
    supabase.from("certificados").select("distancia_km, total_checkins, meio_transporte").eq("user_id", userId),
    supabase.from("peregrinacoes").select("data_inicio").eq("user_id", userId).not("data_inicio", "is", null),
    supabase.from("riscos_informados").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("compras_romaria_plus").select("id").eq("user_id", userId).in("tipo", ["inicial", "cortesia"]),
    supabase.from("mensagens_conquista").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("intencoes_peregrinacao").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("agradecimentos_pap").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const lista = (certs.data ?? []) as { distancia_km: number | null; total_checkins: number | null; meio_transporte: string | null }[];
  const horaBrasilia = (iso: string) =>
    Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));

  let artes = 0;
  const idsCompras = ((compras.data ?? []) as { id: string }[]).map((c) => c.id);
  if (idsCompras.length) {
    const { count } = await supabase
      .from("romaria_plus_fotos")
      .select("id", { count: "exact", head: true })
      .in("compra_id", idsCompras)
      .not("arte_url", "is", null);
    artes = count ?? 0;
  }

  return {
    peregrinacoes: lista.length,
    kmTotal: lista.reduce((s, c) => s + Number(c.distancia_km ?? 0), 0),
    madrugador: ((peregs.data ?? []) as { data_inicio: string }[]).some((p) => horaBrasilia(p.data_inicio) < 6),
    bicicleta: lista.some((c) => c.meio_transporte === "bicicleta"),
    maxCheckins: lista.reduce((m, c) => Math.max(m, Number(c.total_checkins ?? 0)), 0),
    avisos: avisos.count ?? 0,
    artes,
    mensagemConquista: (mensagem.count ?? 0) > 0,
    intencao: (intencao.count ?? 0) > 0,
    agradecimentoPap: (agradecimento.count ?? 0) > 0,
  };
}
