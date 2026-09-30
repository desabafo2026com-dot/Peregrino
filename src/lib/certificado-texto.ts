import type { MeioTransporte } from "@/types/database";

// Rodada 58 — textos padronizados dos certificados (grátis e Plus), no
// formato pedido pelo usuário.

// Como o meio de transporte entra na frase: "a pé", "de bicicleta", "de
// moto", "a cavalo"... Para "outros", usa o que a pessoa descreveu.
export function meioNaFrase(meio: MeioTransporte | null | undefined, outroDesc?: string | null): string {
  if (!meio || meio === "a_pe") return "a pé";
  if (meio === "bicicleta") return "de bicicleta";
  if (meio === "moto") return "de moto";
  const desc = (outroDesc ?? "").trim();
  if (!desc) return "";
  if (/cavalo/i.test(desc)) return "a cavalo";
  if (/^(a|à|de|do|da|em|no|na)\s/i.test(desc)) return desc.toLowerCase();
  return `de ${desc.toLowerCase()}`;
}

// Nome completo em caixa alta.
export function nomeNoCertificado(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

// Todo certificado tem pelo menos 2 check-ins: o do início e o de Aparecida.
export function checkinsNoCertificado(total: number | null | undefined): number {
  return Math.max(2, total ?? 0);
}
