import populacao from "@/data/populacao-sp-mg-rj.json";

// Rodada 76 — com o check-in automático por cidade, uma peregrinação pode
// ter muitas cidades. Na arte "Credencial do peregrino" ficam a cidade de
// início e a chegada (Aparecida) e, entre elas, no máximo as 4 cidades
// maiores (população do Censo 2022, IBGE), na ordem em que a pessoa passou.
// O caderno de bordo continua com todas.
const POP = populacao as Record<string, number>;

function normalizar(t: string) {
  return t
    .replace(/\s*[-/]\s*[A-Za-z]{2}\s*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function populacaoDe(cidade: string): number {
  return POP[normalizar(cidade)] ?? 0;
}

export function cidadesParaArte(cidades: string[], origem: string | null, maximo = 4): string[] {
  const nOrigem = origem ? normalizar(origem) : "";
  const vistas = new Set<string>();
  const meio: string[] = [];
  for (const c of cidades) {
    const n = normalizar(c);
    if (!n || vistas.has(n) || n === "aparecida" || n === nOrigem) continue;
    vistas.add(n);
    meio.push(c);
  }
  if (meio.length <= maximo) return meio;
  const escolhidas = new Set(
    [...meio]
      .map((c, i) => ({ c, i, p: populacaoDe(c) }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
      .slice(0, maximo)
      .map((x) => x.i)
  );
  return meio.filter((_, i) => escolhidas.has(i));
}
