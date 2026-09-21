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

// Rodada 25: lista simplificada a pedido do usuário — de 13 opções (várias
// religiões específicas + "Outra" com campo de texto livre) para só 3 + o
// próprio "Prefiro não informar" (que já era o valor em branco padrão do
// select, sem precisar virar uma 4ª entrada aqui). "Outras (sem
// especificar)" substitui tanto as religiões específicas que existiam
// antes (evangélica, espírita, umbanda/candomblé etc.) quanto o campo de
// texto livre "Outra: qual?" — deixou de perguntar qual é, só que a pessoa
// tem uma.
export const RELIGIOES: { value: string; label: string }[] = [
  { value: "catolica", label: "Católica" },
  { value: "outras", label: "Outras (sem especificar)" },
  { value: "nao_possuo", label: "Não possuo" },
];

// Perfis salvos antes da Rodada 25 podem ter um valor das antigas opções
// específicas (ex.: "evangelica", "testemunha_de_jeova", "outros" com
// religiao_outro_desc preenchido) ou dos antigos "ateu"/"agnostico" — como
// esses valores não existem mais na lista acima, o <select> os mostraria
// em branco. Esta função mapeia o valor salvo antigo para a opção nova
// mais coerente, só para preencher o formulário ao reabrir um perfil já
// existente; o que a pessoa vê ao editar seu perfil é sempre uma das 3
// opções novas (ou branco, para quem tinha "prefiro_nao_dizer" ou nada).
export function normalizarReligiaoAntiga(valor: string | null | undefined): string {
  if (!valor) return "";
  if (valor === "catolica") return "catolica";
  if (valor === "ateu" || valor === "agnostico") return "nao_possuo";
  if (valor === "prefiro_nao_dizer") return "";
  return "outras";
}

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

// Rodada 24 — Romarias em Grupo usa os mesmos 3 status de sempre
// (pendente/aprovado/rejeitado), mas com rótulos próprios: "aprovado" aqui
// significa "visível na lista pública da home", não "no mapa".
export const STATUS_ROMARIA_GRUPO_LABELS: Record<string, string> = {
  pendente: "Aguardando aprovação da administração",
  aprovado: "Aprovada — visível na home",
  rejeitado: "Não aprovada pela administração",
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
  { value: "moto", label: "Moto" },
  { value: "outros", label: "Outros" },
];

export const MEIO_TRANSPORTE_LABELS: Record<string, string> = {
  a_pe: "a pé",
  bicicleta: "de bicicleta",
  moto: "de moto",
  outros: "outro meio de transporte",
};

export const DIAS_PREVISTOS_OPTIONS: number[] = Array.from({ length: 15 }, (_, i) => i + 1);

// Sentido da pista (mão da rodovia) — Norte e Sul de verdade, diferente do
// nome da rota (que é o par cidade-origem/Aparecida). O valor salvo no
// banco continua sendo "sp"/"rj" por compatibilidade, só o rótulo mudou.
export const SENTIDO_PISTA_OPTIONS: { value: string; label: string }[] = [
  { value: "sp", label: "Sentido Norte" },
  { value: "rj", label: "Sentido Sul" },
];

export const BR_OPTIONS: { value: string; label: string }[] = [
  { value: "116", label: "BR-116 (Rodovia Presidente Dutra)" },
  { value: "488", label: "BR-488 (variante)" },
];

export const BR_LABELS: Record<string, string> = {
  "116": "BR-116",
  "488": "BR-488",
};

export const SENTIDO_PISTA_LABELS: Record<string, string> = {
  sp: "Sentido Norte",
  rj: "Sentido Sul",
};

// Abreviação usada junto ao km de referência (ex.: "km 111 N"), seguindo a
// sinalização da rodovia: pista sentido Norte (sp) e sentido Sul (rj).
export const SENTIDO_KM_ABREV: Record<string, string> = {
  sp: "N",
  rj: "S",
};

// Faixa real de km da rodovia coberta por cada rota (informada pelo
// usuário), mostrada como referência nos formulários que pedem a rota, e
// também usada por `kmPertenceARota` (abaixo) para decidir automaticamente
// a qual rota um ponto de risco pertence a partir do seu km.
export const ROTA_FAIXA_KM: Record<string, string> = {
  norte: "km 231 a 71",
  sul: "km 70 a 0",
};

// Nome de exibição de cada rota, pelo slug — usado em vez do campo
// `rotas.nome` do banco diretamente, para que o nome correto ("São Paulo -
// Aparecida"/"Rio de Janeiro - Aparecida", sem "Norte"/"Sul") apareça no
// app mesmo antes de rodar a migration que renomeia as linhas no banco.
export const ROTA_NOME_LABELS: Record<string, string> = {
  norte: "São Paulo - Aparecida",
  sul: "Rio de Janeiro - Aparecida",
};

export function nomeRota(rota: { slug: string; nome: string } | null | undefined): string {
  if (!rota) return "";
  return ROTA_NOME_LABELS[rota.slug] ?? rota.nome;
}

// A qual rota um km real da rodovia pertence — independente do sentido da
// pista (Norte/Sul) e independente de qualquer rota_id escolhido
// manualmente no cadastro: o km 231 a 71 é sempre da rota São Paulo -
// Aparecida, e o km 70 a 0 é sempre da rota Rio de Janeiro - Aparecida.
// Usada para filtrar pontos de risco por rota a partir do km cadastrado,
// evitando que um ponto (por rota_id incorreto, ou marcado como "ambas as
// rotas") apareça na tabela de riscos da rota errada.
export function kmPertenceARota(km: number, rotaSlug: string): boolean {
  if (rotaSlug === "norte") return km > 70;
  if (rotaSlug === "sul") return km >= 0 && km <= 70;
  return true;
}

// Municípios cortados pela Rodovia Presidente Dutra (BR-116) entre São
// Paulo e Queluz-SP, na ordem em que a rodovia passa por eles — usado para
// escolher a cidade do PAP a partir de uma lista, em vez de texto livre.
export const CIDADES_DUTRA_SP_QUELUZ: string[] = [
  "São Paulo",
  "Guarulhos",
  "Arujá",
  "Santa Isabel",
  "Jacareí",
  "São José dos Campos",
  "Caçapava",
  "Taubaté",
  "Tremembé",
  "Pindamonhangaba",
  "Roseira",
  "Aparecida",
  "Potim",
  "Guaratinguetá",
  "Lorena",
  "Cachoeira Paulista",
  "Canas",
  "Queluz",
  // Guararema e Silveiras entraram no trajeto de referência na Migration 18
  // (pontos_checkin) — precisam estar aqui também para o gerente conseguir
  // selecionar a cidade certa ao vincular um PAP pré-cadastrado nelas.
  "Guararema",
  "Silveiras",
];

export const DIAS_SEMANA_OPTIONS: { value: string; label: string; abrev: string }[] = [
  { value: "seg", label: "Segunda", abrev: "Seg" },
  { value: "ter", label: "Terça", abrev: "Ter" },
  { value: "qua", label: "Quarta", abrev: "Qua" },
  { value: "qui", label: "Quinta", abrev: "Qui" },
  { value: "sex", label: "Sexta", abrev: "Sex" },
  { value: "sab", label: "Sábado", abrev: "Sáb" },
  { value: "dom", label: "Domingo", abrev: "Dom" },
];

// Hotéis e Restaurantes (Rodada 21)
export const TIPO_COMERCIO_OPTIONS: { value: string; label: string }[] = [
  { value: "hotel", label: "Hotel / pousada" },
  { value: "restaurante", label: "Restaurante" },
];

export const TIPO_COMERCIO_LABELS: Record<string, string> = {
  hotel: "Hotel / pousada",
  restaurante: "Restaurante",
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

export const CATEGORIAS_SINISTRO: { value: string; label: string }[] = [
  { value: "sinistro", label: "Sinistro" },
  { value: "suspeita", label: "Suspeita" },
  { value: "chuva", label: "Chuva" },
  { value: "outros", label: "Outros" },
];

export const CATEGORIA_SINISTRO_LABELS: Record<string, string> = {
  sinistro: "Sinistro",
  suspeita: "Suspeita",
  chuva: "Chuva",
  outros: "Outros",
};

// Opções de "tipo" disponíveis dentro de cada categoria de relato — ao
// trocar a categoria no formulário, a lista de tipos é trocada por esta.
export const TIPOS_POR_CATEGORIA: Record<string, { value: string; label: string }[]> = {
  sinistro: [
    { value: "geral", label: "Geral" },
    { value: "acidente", label: "Acidente" },
    { value: "atropelamento", label: "Atropelamento" },
    { value: "assalto", label: "Assalto" },
    { value: "incendio", label: "Incêndio" },
    { value: "animais_pista", label: "Animais na pista" },
  ],
  suspeita: [
    { value: "assaltante", label: "Assaltante" },
    { value: "atitude_suspeita", label: "Atitude suspeita" },
    { value: "outros", label: "Outros" },
  ],
  chuva: [
    { value: "fraca", label: "Fraca" },
    { value: "forte", label: "Forte" },
    { value: "com_raios", label: "Com raios" },
  ],
  outros: [{ value: "especificar", label: "Especificar" }],
};

export const STATUS_RISCO_INFORMADO_LABELS: Record<string, string> = {
  pendente: "Aguardando revisão",
  aprovado: "Confirmado pela administração",
  rejeitado: "Não aprovado",
};

// Replica, no código do app, a mesma regra de visibilidade pública que a
// política de RLS "riscos_informados_select_publicos" aplica no banco (ver
// Migration 17 e o reforço da Migration 26): chuva fica pública na hora,
// as demais categorias só depois de 30min sem revisão, e tudo expira em 1h
// — rejeitado nunca aparece. Isso é necessário (Rodada 21) porque a RLS
// também tem uma política separada "select_own_ou_admin" que dá acesso
// irrestrito a quem enviou o relato e a administradores — sem esse filtro
// aplicado aqui no código, uma conta de admin (ou a própria autora do
// relato) veria seus próprios avisos antigos no mapa de "Minha
// peregrinação" muito depois de expirarem para os demais peregrinos,
// porque a RLS "deixaria passar" essas linhas por um motivo que nada tem a
// ver com "ainda está público agora".
export function avisoVisivelPublicamente(r: { status: string; categoria: string; criado_em: string }) {
  if (r.status === "rejeitado") return false;
  const idadeMs = Date.now() - new Date(r.criado_em).getTime();
  if (idadeMs > 60 * 60 * 1000) return false;
  if (r.status === "aprovado") return true;
  if (r.categoria === "chuva") return true;
  return idadeMs >= 30 * 60 * 1000;
}

// Só 3 níveis de risco (Moderado/Alto/Muito alto) — "Muito baixo"/"Baixo"
// foram removidos porque, na prática, ninguém cadastrava um "local de
// risco" que não fosse ao menos moderado; o próprio nome "ponto de risco"
// já implica isso. Ver Migration 18 (atualiza dados antigos com nível 1/2
// para 3, e restringe o banco a 3-5).
export const NIVEL_RISCO_LABELS: Record<number, string> = {
  3: "Moderado",
  4: "Alto",
  5: "Muito alto",
};

export const ROMARIA_PLUS_VALOR_CENTAVOS = 1490;

export const STATUS_COMPRA_ROMARIA_PLUS_LABELS: Record<string, string> = {
  pendente: "Pagamento em processamento",
  pago: "Pago",
  cancelado: "Pagamento não concluído",
  estornado: "Estornado",
};

// Doação livre ("Ajude o desenvolvedor") — sem login, valor digitado pela
// própria pessoa. Limites só para evitar erro de digitação (ex.: R$
// 100000,00 sem querer) — nada impede uma doação maior por fora.
export const DOACAO_VALOR_MINIMO_CENTAVOS = 200;
export const DOACAO_VALOR_MAXIMO_CENTAVOS = 500000;

export const STATUS_MENSAGEM_CONTATO_LABELS: Record<string, string> = {
  novo: "Aguardando leitura",
  lida: "Lida — aguardando resposta",
  respondida: "Respondida",
};

// Sigla em cima (é o que a pessoa reconhece de relance num momento de
// emergência), nome/explicação embaixo — ver EmergencyButton.tsx.
export const EMERGENCIAS = [
  { numero: "190", nome: "PM", descricao: "Ocorrências / assaltos em área urbana" },
  { numero: "191", nome: "PRF", descricao: "Acidentes / assaltos em rodovias" },
  { numero: "193", nome: "Bombeiros", descricao: "Resgate, incêndio, emergência médica" },
  { numero: "192", nome: "SAMU", descricao: "Emergência médica" },
];

// Versão vigente dos Termos de Uso / Política de Privacidade (Rodada 19).
// Precisa bater exatamente com a string gravada dentro da função SQL
// registrar_aceite_termos (supabase/schema.sql, Migration 25) — se um dia
// os termos forem revisados de novo, atualize as DUAS ao mesmo tempo (aqui
// e na função), assim quem já aceitou a versão antiga passa a ver o aviso
// de novo (ver TermosGate.tsx) até aceitar a nova.
export const TERMOS_VERSAO_ATUAL = "1.0 (16/09/2026)";

// Rodada 24 — data de hoje em ISO (YYYY-MM-DD), mesmo formato salvo em
// `datas_funcionamento`. Duplica pequenas funções locais já existentes em
// MapView.tsx/MapClient.tsx (mantidas como estão, para não arriscar
// regressão nelas) — esta versão compartilhada é para o código novo desta
// rodada (contadores do admin, mapa do admin, status do gerente de PAP).
export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Um PAP só conta como "ativo hoje" se tiver datas marcadas no calendário e
// a data atual estiver entre elas — sem nenhuma data marcada, nunca conta
// como ativo (mesmo critério já usado no contador da home e no mapa
// público desde a Rodada 18/20).
export function papAtivoHoje(datasFuncionamento: string[] | null | undefined): boolean {
  if (!datasFuncionamento || datasFuncionamento.length === 0) return false;
  return datasFuncionamento.includes(hojeISO());
}

// Interpreta o texto salvo em periodo_funcionamento ("Aberto 24h",
// "08:00–18:00" no formato produzido pelo próprio formulário do PAP, ou
// texto livre digitado antes desse formulário existir) e diz se o horário
// atual está dentro dele. Texto livre não reconhecido não restringe por
// horário (só a data importa) — mais seguro do que arriscar marcar como
// "fechado" um PAP cujo horário só não bateu com o regex.
export function dentroDoHorario(periodo: string | null | undefined, agora: Date = new Date()): boolean {
  if (!periodo) return true;
  if (periodo.trim().toLowerCase() === "aberto 24h") return true;
  const m = periodo.match(/^(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})$/);
  if (!m) return true;
  const [, h1, min1, h2, min2] = m;
  const inicio = Number(h1) * 60 + Number(min1);
  const fim = Number(h2) * 60 + Number(min2);
  const atual = agora.getHours() * 60 + agora.getMinutes();
  if (inicio === fim) return true;
  if (inicio < fim) return atual >= inicio && atual < fim;
  // Período que cruza a meia-noite (ex.: 22:00–06:00)
  return atual >= inicio || atual < fim;
}

// Rodada 24: substitui o antigo botão "Aberto agora — toque para fechar"
// (alternado manualmente pelo gerente, sem nenhuma relação com o
// calendário/horário que ele mesmo cadastrou) por um status calculado —
// "aberto" só quando a data de hoje está no calendário marcado E o horário
// atual está dentro do período informado.
export function papAbertoAgora(
  p: { datas_funcionamento: string[] | null | undefined; periodo_funcionamento: string | null | undefined },
  agora: Date = new Date()
): boolean {
  return papAtivoHoje(p.datas_funcionamento) && dentroDoHorario(p.periodo_funcionamento, agora);
}
