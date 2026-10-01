// Rodada 59 — os três jeitos de usar o app. Todo mundo tem cadastro (para
// saber quem postou cada informação) e todo mundo recebe o perfil de
// peregrino; gerente de PAP e organizador de Romaria têm, além disso, a
// sua parte própria.
export type TipoConta = "peregrino" | "gerente_pap" | "organizador";

export function lerTipoConta(valor: string | null | undefined): TipoConta | null {
  return valor === "peregrino" || valor === "gerente_pap" || valor === "organizador" ? valor : null;
}

export const NOME_TIPO_CONTA: Record<TipoConta, string> = {
  peregrino: "Peregrino",
  gerente_pap: "Gerente de PAP",
  organizador: "Organizador de Romaria",
};

// Para onde vai quem acabou de completar o perfil pela primeira vez.
export function destinoAposPrimeiroPerfil(tipo: TipoConta | null): string {
  if (tipo === "gerente_pap") return "/gerente-pap";
  if (tipo === "organizador") return "/peregrinacao";
  return "/painel";
}
