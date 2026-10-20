import type { DadosCarimbo } from "@/lib/carimbo-svg";

// Rodada 74 — os check-ins nas cidades do caminho também viram carimbos no
// caderno de bordo (selo retangular "CHECK-IN"), junto com os dos PAPs, em
// ordem de passagem. O check-in da cidade de saída não se repete (já tem o
// carimbo de SAÍDA), nem o de Aparecida quando o carimbo de chegada aparece.
export interface CheckinCaderno {
  id: string;
  criado_em: string;
  cidade: string | null;
}

function normalizar(t: string | null | undefined) {
  return (t ?? "")
    // "Itajubá - MG" → "Itajubá" (origem gravada com a UF, Rodada 75)
    .replace(/\s*[-/]\s*[A-Za-z]{2}\s*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// Supabase devolve a relação como objeto ou lista, conforme o tipo inferido.
// Rodada 76 — check-in automático por município: sem cidade da rota
// (ponto_checkin_id nulo), a cidade vem na própria linha (checkins.cidade).
export function cidadeDoCheckin(rel: unknown, cidadePropria?: unknown): string | null {
  const r = Array.isArray(rel) ? rel[0] : rel;
  return (r as { cidade?: string } | null)?.cidade ?? (typeof cidadePropria === "string" ? cidadePropria : null);
}

export function montarCarimbosCaderno(
  paps: DadosCarimbo[],
  checkins: CheckinCaderno[],
  opcoes: { cidadeSaida?: string | null; comChegada?: boolean }
): DadosCarimbo[] {
  const saida = normalizar(opcoes.cidadeSaida);
  const vistas = new Set<string>();
  const deCidades: DadosCarimbo[] = [];
  for (const c of [...checkins].sort((a, b) => a.criado_em.localeCompare(b.criado_em))) {
    const n = normalizar(c.cidade);
    if (!n || vistas.has(n)) continue;
    vistas.add(n);
    if (saida && n === saida) continue;
    if (opcoes.comChegada && n === "aparecida") continue;
    deCidades.push({ id: `ck-${c.id}`, pap_nome: c.cidade ?? "", cidade: c.cidade, km: null, carimbado_em: c.criado_em, tipo: "cidade" });
  }
  return [...paps.map((p) => ({ ...p, tipo: "pap" as const })), ...deCidades].sort((a, b) =>
    a.carimbado_em.localeCompare(b.carimbado_em)
  );
}
