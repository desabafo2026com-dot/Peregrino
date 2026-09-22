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
export type MeioTransporte = "a_pe" | "bicicleta" | "moto" | "outros";
export type SentidoPista = "sp" | "rj";
export type Br = "116" | "488";
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
  // Versão dos Termos de Uso/Política de Privacidade aceita por último, e
  // quando — gravados só pela função registrar_aceite_termos (Rodada 19),
  // nunca escritos direto pelo app. Nulo = nunca aceitou (ver TermosGate).
  termos_aceitos_versao: string | null;
  termos_aceitos_em: string | null;
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
  termos_aceitos_versao: string | null;
  termos_aceitos_em: string | null;
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
  datas_funcionamento: string[];
  br: Br;
  pre_cadastro_id: string | null;
  ponto_referencia: string | null;
  foto_url: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type TipoComercio = "hotel" | "restaurante";

// Hotéis e Restaurantes (Rodada 21) — cadastro só pela administração, sem o
// fluxo de aprovação de gerente/pré-cadastro que o PAP tem.
export interface PontoComercial {
  id: string;
  tipo: TipoComercio;
  nome: string;
  cidade: string | null;
  br: Br;
  km_referencia: number | null;
  sentido_pista: SentidoPista | null;
  telefone: string | null;
  exibir_telefone: boolean;
  ponto_referencia: string | null;
  descricao: string | null;
  foto_url: string | null;
  latitude: number;
  longitude: number;
  ativo: boolean;
  criado_por: string | null;
  criado_em: string;
}

export interface PapPreCadastro {
  id: string;
  nome: string;
  cidade: string | null;
  br: Br;
  km: number | null;
  sentido_pista: SentidoPista | null;
  data_funcionamento_texto: string | null;
  reivindicado_por: string | null;
  reivindicado_em: string | null;
  // Posição exata marcada pela administração no mapa (Rodada 13) — quando
  // preenchida, substitui a aproximação por cidade usada em /mapa.
  latitude: number | null;
  longitude: number | null;
  // Calendário estruturado (Rodada 18) — mesmo uso de
  // PontoApoio.datas_funcionamento: só conta como ativo (mapa/contador da
  // home) nas datas marcadas aqui. Populado a partir de
  // data_funcionamento_texto; a administração pode revisar pelo calendário.
  datas_funcionamento: string[];
  criado_em: string;
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
  sentido: SentidoPista | null;
  br: Br;
  tipo: string;
  nivel_risco: number;
  ponto_referencia: string | null;
  rota_id: string | null;
  foto_url: string | null;
  criado_em: string;
}

export type StatusRiscoInformado = "pendente" | "aprovado" | "rejeitado";

// Categoria do relato de sinistro/suspeita enviado pelo peregrino durante a
// caminhada — define quais opções de "tipo" ficam disponíveis no formulário
// e a regra de publicação automática (chuva publica na hora; as demais só
// depois de 30min sem revisão da administração — ver migration 11).
export type CategoriaSinistro = "sinistro" | "suspeita" | "chuva" | "outros";

export interface RiscoInformado {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaSinistro;
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
  cidade_inicio: string | null;
  // Rodada 23: a cidade que a pessoa de fato declara como sua origem — na
  // maioria dos casos é a mesma de `cidade_inicio` (uma cidade real da
  // rota), mas para quem vem de fora das duas rotas (cadastro de caravana,
  // "outro estado") é um texto livre, diferente de `cidade_inicio` (que
  // continua sendo sempre uma cidade real, usada para filtrar os
  // check-ins). Nula em peregrinações criadas antes desta rodada.
  cidade_origem: string | null;
  em_grupo: boolean;
  nome_grupo: string | null;
  tamanho_grupo: number | null;
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
  // Rodada 23: a origem declarada pelo peregrino (ver cidade_origem em
  // Peregrinacao), copiada para o certificado no momento da emissão e
  // congelada dali em diante — usada nos textos "de [origem] até
  // Aparecida-SP" do certificado e da Romaria Plus, no lugar da extração
  // por regex de `rota_nome` (quebrada desde a Rodada 10, quando o nome da
  // rota deixou de incluir "(origem → destino)"). Nula em certificados
  // emitidos antes desta rodada.
  origem: string | null;
  meio_transporte: MeioTransporte | null;
  meio_transporte_outro_desc: string | null;
  duracao_texto: string | null;
  distancia_km: number | null;
  emitido_em: string;
}

export type StatusCompraRomariaPlus = "pendente" | "pago" | "cancelado" | "estornado";

// Posição/tamanho do painel de texto sobre a foto, nos modelos que sobrepõem
// texto à imagem ("classico"/"painel") — arrastado e redimensionado pelo
// próprio peregrino (Rodada 17), para evitar cobrir rostos/pessoas na foto.
// x/y são o centro do painel, em % da largura/altura da arte; escala é a
// porcentagem do tamanho original (100 = tamanho padrão do modelo).
// Rodada 23: `fotoPos`/`fotoEscala` guardam, junto no mesmo JSON (a coluna é
// jsonb, sem precisar de migration), o reposicionamento/zoom da FOTO em si
// dentro do recorte de cada modelo — pedido do usuário porque o recorte
// automático (object-fit: cover) podia cortar uma parte da foto que a
// pessoa queria mostrar (rosto, alguém do grupo, etc.), principalmente nos
// modelos com moldura/área fixa. Independente do ajuste de texto acima, e
// disponível nos 4 modelos (não só nos que têm texto sobre a foto).
export interface AjusteOverlayRomariaPlus {
  x: number;
  y: number;
  escala: number;
  fotoPos?: { x: number; y: number };
  fotoEscala?: number;
  // Frase de título escolhida pelo peregrino (Rodada 28, a pedido do
  // usuário — antes era sempre "Romaria para Aparecida", fixo) — igual ao
  // ajuste de foto, independente do modelo escolhido. "peregrinacao" é o
  // padrão e substitui o texto antigo ("Peregrinação para Aparecida" no
  // lugar de "Romaria para Aparecida", já que "Romaria" agora é o nome da
  // funcionalidade de romarias em grupo). Rodada 29: mais duas frases prontas
  // ("comigo"/"obrigado") e uma opção "personalizada" (texto livre digitado
  // pelo peregrino, guardado em fraseCustom) — o ano exibido continua sempre
  // fixo (o da conclusão), sem opção de mudar, em qualquer frase.
  frase?: "peregrinacao" | "venci" | "gracas" | "comigo" | "obrigado" | "personalizada";
  fraseCustom?: string;
  // Transparência do fundo escurecido do "Selo de conquista" (Rodada 30) —
  // 0 a 100, quanto maior mais a foto aparece por trás do selo/texto.
  transparencia?: number;
}

// Compra do produto pago "Romaria Plus" (arte personalizada para
// compartilhar), vinculada a um certificado já emitido. O caminho normal de
// insert/update é o servidor (rotas /api/mercadopago/...) com a service
// role, já que preço e status de pagamento não podem depender de nada que o
// navegador envie. Duas exceções, ambas via função SECURITY DEFINER (nunca
// insert/update direto do cliente): resgatar_cupom_romaria_plus (Rodada 16,
// cupom digitado pelo peregrino) e admin_liberar_romaria_plus_teste (Rodada
// 16, acesso de teste do próprio admin) — as duas criam a compra já como
// "pago", com valor_centavos = 0.
export interface CompraRomariaPlus {
  id: string;
  certificado_id: string;
  user_id: string;
  valor_centavos: number;
  status: StatusCompraRomariaPlus;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  criado_em: string;
  pago_em: string | null;
  // Ano de conclusão da peregrinação do certificado vinculado — trava a
  // edição da foto a este ano específico (Rodada 15).
  ano: number | null;
  // Foto/modelo escolhidos pelo peregrino, agora persistidos (bucket
  // romaria-plus-fotos) em vez de existirem só na memória do navegador —
  // permite à administração ver, baixar ou substituir (Rodada 15). "painel"
  // e "moldura" são os dois modelos novos da Rodada 17.
  foto_url: string | null;
  // A partir da Rodada 18, a foto/modelo/ajuste de cada arte fica em
  // romaria_plus_fotos (até 5 por compra) — estes três campos continuam
  // aqui só para compras antigas que ainda não foram migradas na tela
  // (a migration 24 já copia o que existir para a foto de índice 1).
  // "itinerario" e "selo" são os dois modelos novos da Rodada 27.
  modelo: "classico" | "destaque" | "painel" | "moldura" | "itinerario" | "selo" | null;
  // Posição/tamanho customizados do texto, só relevante para "classico" e
  // "painel" (Rodada 17) — null usa a posição padrão do modelo.
  ajuste_overlay: AjusteOverlayRomariaPlus | null;
  // Rodada 30: "inicial" é a compra do Certificado Plus (5 fotos, como
  // sempre foi); "extra" é um pacote de +5 fotos comprado depois, avulso,
  // sempre vinculado a uma compra "inicial" já paga (compra_pai_id). O
  // limite de fotos de uma compra "inicial" é 5 + 5 × (pacotes extra pagos
  // vinculados a ela) — ver salvar_foto_romaria_plus_slot no banco.
  tipo: "inicial" | "extra";
  compra_pai_id: string | null;
}

// Uma das até 5 artes/fotos que um peregrino com Romaria Plus pode criar
// para o mesmo certificado (Rodada 18) — cada uma com seu próprio modelo,
// ajuste de posição e contadores de download/compartilhamento.
export interface RomariaPlusFoto {
  id: string;
  compra_id: string;
  user_id: string;
  indice: number;
  foto_url: string;
  // "itinerario" e "selo" são os dois modelos novos da Rodada 27.
  modelo: "classico" | "destaque" | "painel" | "moldura" | "itinerario" | "selo";
  ajuste_overlay: AjusteOverlayRomariaPlus | null;
  contador_downloads: number;
  contador_compartilhamentos: number;
  criado_em: string;
  atualizado_em: string;
}

// Cupom de código para liberar a Romaria Plus gratuitamente (Rodada 16) —
// gerado em lote pelo admin (quantidade pré-definida) para distribuir a
// peregrinos, e resgatado por um deles digitando o código na página do
// certificado (RPC resgatar_cupom_romaria_plus).
export interface CupomRomariaPlus {
  id: string;
  codigo: string;
  criado_por: string | null;
  usado_por: string | null;
  compra_id: string | null;
  criado_em: string;
  usado_em: string | null;
}

// Doação livre ("Ajude o desenvolvedor", Rodada 13) — sem login, valor
// digitado pela própria pessoa. Mesma regra de segurança da Romaria Plus:
// todo insert/update é feito pelo servidor (rotas /api/mercadopago/...)
// com a service role, nunca diretamente pelo cliente.
export interface Doacao {
  id: string;
  valor_centavos: number;
  status: StatusCompraRomariaPlus;
  nome_doador: string | null;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  criado_em: string;
  pago_em: string | null;
}

export type StatusRomariaGrupo = "pendente" | "aprovado" | "rejeitado";

// Cadastro público de caravana/grupo de romaria (Rodada 24) — puramente
// informativo, para autoridades e outros peregrinos saberem de um grupo em
// trânsito. Precisa de aprovação da administração antes de aparecer na
// lista pública da home.
export interface RomariaGrupo {
  id: string;
  user_id: string;
  nome: string;
  cidade_origem: string;
  quantidade: number;
  data_inicio: string;
  previsao_dias: number;
  organizador_nome: string | null;
  exibir_organizador: boolean;
  organizador_telefone: string | null;
  exibir_telefone: boolean;
  meio_deslocamento: MeioTransporte;
  meio_deslocamento_outro_desc: string | null;
  status: StatusRomariaGrupo;
  observacao_admin: string | null;
  criado_em: string;
  aprovado_em: string | null;
}

// Mensagem pública de conquista (Rodada 27) — deixada opcionalmente pelo
// peregrino ao concluir a peregrinação, para quem ainda não terminou ou não
// começou. Nome (primeiro nome) e cidade (origem da peregrinação) ficam
// congelados no momento da publicação. Mostrada uma a uma no carrossel da
// home, com "ativo=false" usado pela administração para ocultar sem apagar.
export interface MensagemConquista {
  id: string;
  user_id: string;
  certificado_id: string;
  nome: string;
  cidade: string | null;
  mensagem: string;
  ativo: boolean;
  criado_em: string;
}

export type StatusMensagemContato = "novo" | "lida" | "respondida";

// "Falar com o desenvolvedor" (Rodada 7) — canal simples dentro do app,
// sem e-mail/SMS: o usuário escreve pelo perfil, a administração responde
// pelo painel admin e a resposta volta para a mesma tela de quem enviou.
export interface MensagemContato {
  id: string;
  user_id: string;
  assunto: string | null;
  mensagem: string;
  status: StatusMensagemContato;
  resposta_admin: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  criado_em: string;
}

// Tipagem mínima para o cliente Supabase tipado (@supabase/ssr)
// Mantida simples de propósito — pode ser substituída pelo gerador oficial
// `supabase gen types typescript` quando o projeto estiver criado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
