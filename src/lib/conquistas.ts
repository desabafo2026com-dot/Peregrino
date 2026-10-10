// Rodada 65 — nível do peregrino (pela quantidade de peregrinações
// concluídas no app) e medalhas de conquista. Tudo calculado a partir dos
// dados que o app já guarda — nada é digitado à mão.

export interface NivelPeregrino {
  nome: string;
  curto: string;
  descricao: string;
  cor: string; // fundo da fita/selo
  proximo: { nome: string; faltam: number } | null;
}

const NIVEIS: { min: number; nome: string; curto: string; descricao: string; cor: string }[] = [
  { min: 0, nome: "Peregrino Aspirante", curto: "Aspirante", descricao: "Ainda vai concluir a primeira peregrinação.", cor: "#8a7560" },
  { min: 1, nome: "Peregrino Iniciante", curto: "Iniciante", descricao: "1 peregrinação concluída.", cor: "#2f7a4f" },
  { min: 2, nome: "Peregrino Intermediário", curto: "Intermediário", descricao: "2 peregrinações concluídas.", cor: "#1f5fa8" },
  { min: 3, nome: "Peregrino Expert", curto: "Expert", descricao: "De 3 a 9 peregrinações concluídas.", cor: "#7b3fa0" },
  { min: 10, nome: "Mestre Romeiro", curto: "Mestre Romeiro", descricao: "De 10 a 19 peregrinações concluídas.", cor: "#b8621a" },
  { min: 20, nome: "Romeiro de Honra", curto: "Romeiro de Honra", descricao: "20 peregrinações ou mais.", cor: "#8f3f19" },
];

export function nivelPeregrino(qtd: number): NivelPeregrino {
  let i = 0;
  NIVEIS.forEach((n, k) => {
    if (qtd >= n.min) i = k;
  });
  const n = NIVEIS[i];
  const prox = NIVEIS[i + 1];
  return {
    nome: n.nome,
    curto: n.curto,
    descricao: n.descricao,
    cor: n.cor,
    proximo: prox ? { nome: prox.nome, faltam: prox.min - qtd } : null,
  };
}

export const TODOS_NIVEIS = NIVEIS;

export interface DadosConquistas {
  peregrinacoes: number; // concluídas com certificado (no app)
  foraApp: number | null; // Rodada 66 — informadas pelo peregrino (somam no nível e nas medalhas de quantidade)
  kmTotal: number;
  madrugador: boolean; // começou alguma antes das 6h
  bicicleta: boolean;
  maxCheckins: number;
  avisos: number; // avisos de ocorrência enviados
  artes: number; // artes da Romaria Plus salvas
  mensagemConquista: boolean;
  intencao: boolean;
  agradecimentoPap: boolean;
}

export interface Medalha {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  conquistada: boolean;
}

export function calcularMedalhas(d: DadosConquistas): Medalha[] {
  const m = (id: string, emoji: string, nome: string, descricao: string, conquistada: boolean): Medalha => ({
    id,
    emoji,
    nome,
    descricao,
    conquistada,
  });
  const total = d.peregrinacoes + (d.foraApp ?? 0);
  return [
    m("primeiro-passo", "👣", "Primeiro passo", "Concluir a primeira peregrinação.", total >= 1),
    m("romeiro-fiel", "🙏", "Romeiro fiel", "Concluir 3 peregrinações.", total >= 3),
    m("devoto", "🌹", "Devoto de Aparecida", "Concluir 5 peregrinações.", total >= 5),
    m("mestre", "👑", "Mestre do caminho", "Concluir 10 peregrinações.", total >= 10),
    m("km50", "🥾", "50 km de fé", "Somar 50 km nas peregrinações.", d.kmTotal >= 50),
    m("km100", "💯", "Centenário", "Somar 100 km nas peregrinações.", d.kmTotal >= 100),
    m("km500", "🦶", "Pés de ferro", "Somar 500 km nas peregrinações.", d.kmTotal >= 500),
    m("madrugador", "🌅", "Madrugador", "Começar uma peregrinação antes das 6h.", d.madrugador),
    m("bicigrino", "🚲", "Bicigrino", "Concluir uma peregrinação de bicicleta.", d.bicicleta),
    m("carimbos", "📍", "Colecionador de carimbos", "Fazer 6 check-ins ou mais numa peregrinação.", d.maxCheckins >= 6),
    m("anjo", "🦺", "Anjo da estrada", "Avisar outros peregrinos sobre uma ocorrência no caminho.", d.avisos >= 1),
    m("artista", "🎨", "Artista do caminho", "Criar uma arte com foto da peregrinação.", d.artes >= 1),
    m("voz", "💬", "Voz da conquista", "Deixar uma mensagem de conquista para outros peregrinos.", d.mensagemConquista),
    m("intencao", "🕯️", "Intenção no coração", "Registrar um pedido ou agradecimento no planejamento.", d.intencao),
    m("gratidao", "💛", "Coração agradecido", "Agradecer a um Ponto de Apoio depois de concluir.", d.agradecimentoPap),
  ];
}
