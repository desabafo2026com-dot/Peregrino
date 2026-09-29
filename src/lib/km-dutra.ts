import { normalizarCidade } from "@/lib/pap-pre-cadastro-mapa";
import type { PontoRisco } from "@/types/database";

// Rodada 46 — km real da Via Dutra (BR-116, trecho paulista) de
// referência na ENTRADA de cada cidade de check-in, informados pelo
// usuário. O mesmo número vale para as duas rotas: na rota São Paulo -
// Aparecida ("norte") o km DIMINUI até Aparecida; na rota Rio de Janeiro -
// Aparecida ("sul", a partir de Queluz) o km AUMENTA até Aparecida.
// Silveiras não veio na lista do usuário: fica entre Cruzeiro (32) e
// Cachoeira Paulista (39) na ordem da rota, então usa 36 até ser
// confirmado. Para corrigir algum, basta trocar o número aqui.
export const KM_DUTRA_APARECIDA = 71;

const KM_DUTRA_ENTRADA_CIDADE: Record<string, number> = {
  "sao paulo": 231,
  guarulhos: 220,
  aruja: 203,
  "santa isabel": 186,
  guararema: 176,
  jacarei: 160,
  "sao jose dos campos": 150,
  cacapava: 127,
  taubate: 111,
  pindamonhangaba: 99,
  roseira: 80,
  aparecida: 71,
  guaratingueta: 65,
  lorena: 53,
  canas: 44,
  "cachoeira paulista": 39,
  silveiras: 36,
  cruzeiro: 32,
  lavrinhas: 22,
  queluz: 6,
};

export function kmDutraEntrada(rotaSlug: string | null | undefined, cidade: string): number | null {
  if (!rotaSlug) return null;
  return KM_DUTRA_ENTRADA_CIDADE[normalizarCidade(cidade)] ?? null;
}

// Quantos km faltam até Aparecida (Basílica, km 71) a partir de um km da
// Dutra — mesma conta nas duas rotas, só muda o lado.
export function kmFaltamAparecida(kmDutra: number): number {
  return Math.max(0, Math.round(Math.abs(kmDutra - KM_DUTRA_APARECIDA)));
}

// Um ponto de risco ainda está "à frente" do peregrino se o km dele fica
// entre o km de referência atual (entrada da cidade do último check-in, ou
// da cidade de início) e Aparecida. Sem km cadastrado não dá para saber —
// continua aparecendo, por segurança.
export function riscoAindaAFrente(
  risco: Pick<PontoRisco, "km_referencia">,
  rotaSlug: string | null | undefined,
  kmReferenciaAtual: number | null
): boolean {
  if (risco.km_referencia == null || kmReferenciaAtual == null || !rotaSlug) return true;
  const km = risco.km_referencia;
  if (rotaSlug === "norte") return km <= kmReferenciaAtual && km >= KM_DUTRA_APARECIDA - 1;
  if (rotaSlug === "sul") return km >= kmReferenciaAtual && km <= KM_DUTRA_APARECIDA + 1;
  return true;
}

// Km de referência atual do peregrino: a entrada da cidade de check-in
// mais adiantada já feita (maior "ordem") ou, sem nenhum check-in, a da
// primeira cidade da caminhada.
export function kmReferenciaAtual(
  rotaSlug: string | null | undefined,
  pontosCheckin: { id: string; cidade: string; ordem: number }[],
  checkinsFeitosIds: string[]
): number | null {
  if (pontosCheckin.length === 0) return null;
  const feitos = new Set(checkinsFeitosIds);
  const ordenados = [...pontosCheckin].sort((a, b) => a.ordem - b.ordem);
  const feitosOrdenados = ordenados.filter((p) => feitos.has(p.id));
  const atual = feitosOrdenados.length ? feitosOrdenados[feitosOrdenados.length - 1] : ordenados[0];
  return kmDutraEntrada(rotaSlug, atual.cidade);
}
