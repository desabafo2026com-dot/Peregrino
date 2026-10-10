import { unstable_cache } from "next/cache";
import { createIsolatedClient } from "@/lib/supabase/isolatedClient";
import type { RomariaGrupo, MensagemConquista } from "@/types/database";
import type { AgradecimentoPapPublico, IntencaoMural } from "@/lib/mural";

// Rodada 65b — dados PÚBLICOS da página inicial (iguais para todo mundo),
// guardados no servidor da Vercel por 60 segundos. Antes, cada abertura da
// home fazia 5 consultas ao Supabase; com milhares de peregrinos isso
// consumiria a cota gratuita de tráfego do Supabase (5 GB/mês). Agora são
// no máximo 5 consultas por minuto, não importa quantas pessoas abram.
// Consequência (transparente): números e mensagens novas levam até 1 minuto
// para aparecer na home.
export interface DadosHomePublicos {
  stats: { acessos_hoje: number; acessos_total: number; paps_ativos: number; paps_total: number } | null;
  mural: IntencaoMural[];
  agradecimentos: AgradecimentoPapPublico[];
  romarias: RomariaGrupo[];
  mensagensConquista: MensagemConquista[];
}

export const carregarHomePublica = unstable_cache(
  async (): Promise<DadosHomePublicos> => {
    const supabase = createIsolatedClient();
    const [stats, mural, agradecimentos, romarias, mensagens] = await Promise.all([
      supabase.rpc("estatisticas_publicas_v2").maybeSingle(),
      supabase.from("mural_intencoes").select("*").order("desde", { ascending: false }).limit(40),
      supabase.from("agradecimentos_pap_publico").select("*").order("criado_em", { ascending: false }).limit(40),
      supabase.from("romarias_grupo_publico").select("*").eq("status", "aprovado").order("data_inicio", { ascending: true }),
      supabase.from("mensagens_conquista").select("*").eq("ativo", true).order("criado_em", { ascending: false }).limit(30),
    ]);
    return {
      stats: (stats.data as DadosHomePublicos["stats"]) ?? null,
      mural: (mural.data ?? []) as IntencaoMural[],
      agradecimentos: (agradecimentos.data ?? []) as AgradecimentoPapPublico[],
      romarias: (romarias.data ?? []) as RomariaGrupo[],
      mensagensConquista: (mensagens.data ?? []) as MensagemConquista[],
    };
  },
  ["home-publica-v1"],
  { revalidate: 60 }
);
