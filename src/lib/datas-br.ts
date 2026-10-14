// Rodada 68 — "2019-10-10" → "10/10/2019", sem passar por fuso horário
// (uma data pura não deve "voltar um dia" por causa do UTC).
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

// Data e hora em Brasília: "13/10/2026 às 05:42".
export function dataHoraBR(iso: string): string {
  const dt = new Date(iso);
  const data = dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
}

// Hoje em Brasília, "aaaa-mm-dd" (limite do campo de data).
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
