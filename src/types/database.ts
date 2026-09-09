export type Sexo = "masculino" | "feminino" | "outro" | "prefiro_nao_dizer";
export type Motivo =
  | "promessa"
  | "curiosidade"
  | "desafio"
  | "companhia"
  | "fe"
  | "aventura"
  | "religiosidade"
  | "outros";
export type StatusPeregrinacao = "planejada" | "em_andamento" | "concluida" | "cancelada";
export type StatusGerentePap = "pendente" | "aprovado" | "rejeitado";
export type StatusAprovacaoPap = "pendente" | "aprovado" | "rejeitado";
export type MeioTransporte = "a_pe" | "bicicleta" | "outros";
export type SentidoPista = "sp" | "rj";
export type LadoRodovia =
  | "marginal_norte"
  | "marginal_sul"
  | "pista_norte"
  | "pista_sul"
  | "acostamento"
  | "nao_recomendado";

export interface Profile {
  id: string;
  nome_completo: string;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  faz_parte_grupo: boolean;
  nome_grupo: string | null;
  ja_fez_trajeto: boolean;
  data_nascimento: string | null;
  sexo: Sexo | null;
  religiao: string | null;
  religiao_outro_desc: string | null;
  motivo: Motivo | null;
  motivo_outro_desc: string | null;
  tem_acompanhamento_carro_apoio: boolean;
  aceita_compartilhar_localizacao: boolean;
  avatar_url: string | null;
  is_admin: boolean;
  is_agente: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface GerentePap {
  id: string;
  nome_completo: string;
  telefone: string;
  nome_organizacao: string | null;
  status: StatusGerentePap;
  observacao_admin: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  criado_em: string;
}

export interface PontoCheckin {
  id: string;
  rota_id: string;
  cidade: string;
  ordem: number;
  km_aproximado: number | null;
  latitude: number;
  longitude: number;
  descricao: string | null;
  criado_em: string;
}

export interface Rota {
  id: string;
  slug: string;
  nome: string;
  origem: string;
  destino: string;
  cor: string;
  ordem: number;
  criado_em: string;
}

export interface PontoApoio {
  id: string;
  criado_por: string | null;
  gerente_id: string | null;
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  latitude: number;
  longitude: number;
  km_referencia: number | null;
  periodo_funcionamento: string | null;
  servicos: string[];
  contato_doacao: string | null;
  observacoes: string | null;
  ativo: boolean;
  status_aprovacao: StatusAprovacaoPap;
  aberto_agora: boolean;
  observacao_admin: string | null;
  rota_id: string | null;
  cidade: string | null;
  sentido_pista: SentidoPista | null;
  exibir_telefone: boolean;
  aceita_doacoes: boolean;
  doacao_necessidade: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface TrechoSeguranca {
  id: string;
  km_inicial: number;
  km_final: number;
  lado_recomendado: LadoRodovia;
  observacao: string | null;
  nivel_risco: number;
  rota_id: string;
  criado_em: string;
}

export interface PontoRisco {
  id: string;
  titulo: string;
  descricao: string | null;
  latitude: number;
  longitude: number;
  km_referencia: number | null;
  tipo: string;
  nivel_risco: number;
  rota_id: string | null;
  criado_em: string;
}

export type StatusRiscoInformado = "pendente" | "aprovado" | "rejeitado";

export interface RiscoInformado {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  nivel_risco: number;
  latitude: number;
  longitude: number;
  km_referencia: number | null;
  rota_id: string | null;
  status: StatusRiscoInformado;
  observacao_admin: string | null;
  ponto_risco_id: string | null;
  criado_em: string;
}

export interface Peregrinacao {
  id: string;
  user_id: string;
  status: StatusPeregrinacao;
  dias_previstos: number | null;
  data_inicio_prevista: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  compartilhar_localizacao: boolean;
  meio_transporte: MeioTransporte;
  meio_transporte_outro_desc: string | null;
  rota_id: string | null;
  em_grupo: boolean;
  nome_grupo: string | null;
  criado_em: string;
}

export interface LocalizacaoAtiva {
  peregrinacao_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  precisao_m: number | null;
  atualizado_em: string;
}

export interface Checkin {
  id: string;
  peregrinacao_id: string;
  user_id: string;
  ponto_apoio_id: string | null;
  ponto_checkin_id: string | null;
  latitude: number;
  longitude: number;
  criado_em: string;
}

export interface Certificado {
  id: string;
  peregrinacao_id: string;
  user_id: string;
  codigo: string;
  nome_peregrino: string;
  dias_caminhada: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  total_checkins: number;
  rota_nome: string | null;
  meio_transporte: MeioTransporte | null;
  meio_transporte_outro_desc: string | null;
  duracao_texto: string | null;
  emitido_em: string;
}

// Tipagem mínima para o cliente Supabase tipado (@supabase/ssr)
// Mantida simples de propósito — pode ser substituída pelo gerador oficial
// `supabase gen types typescript` quando o projeto estiver criado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
