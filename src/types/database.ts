export type Sexo = "masculino" | "feminino" | "outro" | "prefiro_nao_dizer";
export type Motivo = "promessa" | "curiosidade" | "desafio" | "companhia" | "outros";
export type StatusPeregrinacao = "planejada" | "em_andamento" | "concluida" | "cancelada";
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
  cidade: string;
  faz_parte_grupo: boolean;
  nome_grupo: string | null;
  ja_fez_trajeto: boolean;
  data_nascimento: string;
  sexo: Sexo;
  religiao: string | null;
  motivo: Motivo;
  motivo_outro_desc: string | null;
  tem_acompanhamento_carro_apoio: boolean;
  aceita_compartilhar_localizacao: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface PontoApoio {
  id: string;
  criado_por: string | null;
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
  emitido_em: string;
}

// Tipagem mínima para o cliente Supabase tipado (@supabase/ssr)
// Mantida simples de propósito — pode ser substituída pelo gerador oficial
// `supabase gen types typescript` quando o projeto estiver criado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
