export const MOTIVOS: { value: string; label: string }[] = [
  { value: "fe", label: "Fé" },
  { value: "promessa", label: "Promessa" },
  { value: "religiosidade", label: "Religiosidade" },
  { value: "aventura", label: "Aventura" },
  { value: "curiosidade", label: "Curiosidade" },
  { value: "desafio", label: "Desafio pessoal" },
  { value: "companhia", label: "Companhia (amigo/família)" },
  { value: "outros", label: "Outros" },
];

export const RELIGIOES: { value: string; label: string }[] = [
  { value: "catolica", label: "Católica" },
  { value: "evangelica", label: "Evangélica" },
  { value: "espirita", label: "Espírita" },
  { value: "umbanda_candomble", label: "Umbanda / Candomblé" },
  { value: "testemunha_de_jeova", label: "Testemunha de Jeová" },
  { value: "mormon", label: "Mórmon (SUD)" },
  { value: "judaica", label: "Judaica" },
  { value: "islamica", label: "Islâmica" },
  { value: "budista", label: "Budista" },
  { value: "ateu", label: "Ateu(a)" },
  { value: "agnostico", label: "Agnóstico(a)" },
  { value: "outros", label: "Outra" },
  { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
];

export const AVATARES_PEREGRINO: string[] = [
  "/avatars/peregrino-1.svg",
  "/avatars/peregrino-2.svg",
  "/avatars/peregrino-3.svg",
  "/avatars/peregrino-4.svg",
  "/avatars/peregrino-5.svg",
  "/avatars/peregrino-6.svg",
];

export const STATUS_GERENTE_LABELS: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const STATUS_PAP_LABELS: Record<string, string> = {
  pendente: "Aguardando aprovação da administração",
  aprovado: "Publicado no mapa",
  rejeitado: "Não aprovado pela administração",
};

export const SEXO_OPTIONS: { value: string; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
  { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
];

export const SERVICOS_PONTO_APOIO: { value: string; label: string }[] = [
  { value: "agua", label: "Água" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "descanso", label: "Área de descanso" },
  { value: "banheiro", label: "Banheiro" },
  { value: "primeiros_socorros", label: "Primeiros socorros" },
  { value: "pernoite", label: "Pernoite" },
  { value: "carga_celular", label: "Carregar celular" },
  { value: "apoio_espiritual", label: "Apoio espiritual" },
];

export const MEIO_TRANSPORTE_OPTIONS: { value: string; label: string }[] = [
  { value: "a_pe", label: "A pé" },
  { value: "bicicleta", label: "Bicicleta" },
  { value: "outros", label: "Outros" },
];

export const MEIO_TRANSPORTE_LABELS: Record<string, string> = {
  a_pe: "a pé",
  bicicleta: "de bicicleta",
  outros: "outro meio de transporte",
};

export const DIAS_PREVISTOS_OPTIONS: number[] = Array.from({ length: 15 }, (_, i) => i + 1);

export const SENTIDO_PISTA_OPTIONS: { value: string; label: string }[] = [
  { value: "sp", label: "Sentido São Paulo (Rota Norte)" },
  { value: "rj", label: "Sentido Rio de Janeiro (Rota Sul)" },
];

export const SENTIDO_PISTA_LABELS: Record<string, string> = {
  sp: "Sentido São Paulo",
  rj: "Sentido Rio de Janeiro",
};

export const PAP_SIGLA = "PAP";
export const PAP_NOME_COMPLETO = "PAP — Ponto de Apoio ao Peregrino";

export const LADO_RODOVIA_LABELS: Record<string, string> = {
  marginal_norte: "Marginal sentido Norte",
  marginal_sul: "Marginal sentido Sul",
  pista_norte: "Pista sentido Norte",
  pista_sul: "Pista sentido Sul",
  acostamento: "Acostamento (sem marginal)",
  nao_recomendado: "Trecho não recomendado a pé",
};

export const TIPOS_RISCO: { value: string; label: string }[] = [
  { value: "geral", label: "Geral" },
  { value: "transito", label: "Trânsito / atropelamento" },
  { value: "assalto", label: "Assalto / segurança" },
  { value: "sem_acostamento", label: "Sem acostamento / marginal" },
  { value: "animal", label: "Animais na pista" },
  { value: "iluminacao", label: "Falta de iluminação" },
];

export const STATUS_RISCO_INFORMADO_LABELS: Record<string, string> = {
  pendente: "Aguardando revisão",
  aprovado: "Aprovado — publicado no mapa",
  rejeitado: "Não aprovado",
};

export const NIVEL_RISCO_LABELS: Record<number, string> = {
  1: "Muito baixo",
  2: "Baixo",
  3: "Moderado",
  4: "Alto",
  5: "Muito alto",
};

export const EMERGENCIAS = [
  { numero: "190", nome: "Polícia Militar", descricao: "Ocorrências policiais / assaltos" },
  { numero: "191", nome: "PRF", descricao: "Polícia Rodoviária Federal — acidentes na rodovia" },
  { numero: "193", nome: "Bombeiros", descricao: "Resgate, incêndio, emergência médica" },
  { numero: "192", nome: "SAMU", descricao: "Emergência médica" },
];
