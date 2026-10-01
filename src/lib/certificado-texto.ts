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

// Rodada 58b — tempo total "em dias (se houver um ou mais), horas e
// minutos", calculado do início ao fim da peregrinação. Ex.: "4 dias, 7
// horas e 12 minutos" ou "9 horas e 5 minutos". Sem as datas, usa o texto
// gravado no certificado.
export function tempoNoCertificado(
  inicio: string | null | undefined,
  fim: string | null | undefined,
  reserva?: string | null
): string | null {
  if (inicio && fim) {
    const totalMin = Math.max(0, Math.floor((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
    const dias = Math.floor(totalMin / 1440);
    const horas = Math.floor((totalMin % 1440) / 60);
    const minutos = totalMin % 60;
    const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
    const hm = `${plural(horas, "hora", "horas")} e ${plural(minutos, "minuto", "minutos")}`;
    return dias > 0 ? `${plural(dias, "dia", "dias")}, ${hm}` : hm;
  }
  return reserva ?? null;
}
