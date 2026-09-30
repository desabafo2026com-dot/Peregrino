import AcessosSiteResumo, { type EstatisticasAcessos } from "@/components/AcessosSiteResumo";
import { createClient } from "@/lib/supabase/server";
import { nomeRota, avisoVisivelPublicamente, papAtivoHoje } from "@/lib/constants";
import { posicionarPapsPreCadastro } from "@/lib/pap-pre-cadastro-mapa";
import type { PapPreCadastroMapa } from "@/components/MapView";
import AdminMapClient from "./AdminMapClient";
import AdminDrilldownClient, {
  type PeregrinoLinha,
  type PeregrinacaoLinha,
  type PapLinha,
  type RiscoLinha,
  type RiscoInformadoLinha,
  type GerenteLinha,
  type RomariaGrupoLinha,
  type CadastroLinha,
} from "./AdminDrilldownClient";
import VoltarButton from "@/components/VoltarButton";
import type {
  PapPreCadastro,
  PontoCheckin,
  PontoApoio,
  PontoRisco,
  Rota,
  MeioTransporte,
  Peregrinacao,
  RiscoInformado,
  RomariaGrupo,
} from "@/types/database";

// Rodada 34 — corrige um peregrino que iniciou a caminhada hoje e não
// aparecia no contador "iniciadas hoje": este arquivo roda no servidor
// (Server Component), e o processo Node roda em UTC, não no horário de
// Brasília. Como `data_inicio`/`data_fim` são timestamps completos
// (timestamptz), um evento registrado entre ~21h e 23h59 no horário de
// Brasília já corresponde ao dia seguinte em UTC — então comparar os
// componentes de data com getFullYear/getMonth/getDate (que usam o fuso
// local do processo) "perdia" esses casos. A comparação abaixo usa sempre o
// dia civil em America/Sao_Paulo. Campos `date` puros do Postgres (só
// "AAAA-MM-DD", sem hora nem fuso, ex.: data_inicio_prevista) são comparados
// direto pela string — convertê-los para horário de Brasília na verdade
// introduziria o erro (aparentariam ser um dia antes).
function diaCivilBrasil(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function ehHoje(iso: string | null) {
  if (!iso) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso === diaCivilBrasil(new Date());
  }
  return diaCivilBrasil(new Date(iso)) === diaCivilBrasil(new Date());
}

// Rodada 41 — contador "Novos (7 dias)" do módulo Cadastros. `criado_em`
// é um instante absoluto (timestamptz), então comparar direto com "agora"
// não tem problema de fuso horário.
function criadoNosUltimos7Dias(iso: string) {
  return new Date(iso).getTime() >= new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const isAdmin = !!perfil?.is_admin;

  // Rodada 24: busca TODOS os PAP (não só aprovados) — a Rodada 23 tinha
  // filtrado só por "aprovado" aqui, mas esta mesma lista também alimenta os
  // contadores do módulo "PAP" abaixo (Cadastrados/Pendentes), então esse
  // filtro escondia por completo os PAP pendentes dos contadores (bug
  // relatado pelo usuário: "não estava contando pendentes de aprovação").
  // O mapa (AdminMapClient, mais abaixo) filtra por conta própria os que
  // realmente devem aparecer na camada "PAP ativos". Os avisos de
  // peregrinos também aparecem aqui, filtrados pela mesma regra de
  // visibilidade pública já usada em /peregrinacao e /peregrinacao/trajeto
  // desde a Rodada 21 — o admin vê exatamente o que qualquer peregrino veria
  // no mapa, não o que a própria conta de admin tem permissão de enxergar.
  const [{ data: pontosApoio }, { data: pontosRisco }, { data: localizacoesData }] = await Promise.all([
    supabase.from("pontos_apoio").select("*"),
    supabase.from("pontos_risco").select("*"),
    // Rodada 28, corrigindo bug relatado pelo usuário ("já encerrei os que
    // estavam em teste" mas o mapa continuava mostrando "2 peregrinos em
    // caminhada"): antes esta consulta trazia TODA linha de
    // localizacoes_ativas, mesmo peregrinações já concluídas — a limpeza
    // dependia só da própria tela de "encerrar peregrinação" apagar a linha
    // na hora, o que não acontece se a pessoa fechar a aba/app sem clicar em
    // encerrar, deixando um "fantasma" no mapa para sempre. Agora o próprio
    // filtro exige que a peregrinação vinculada ainda esteja em andamento —
    // o mapa se corrige sozinho independente de qualquer limpeza manual.
    supabase
      .from("localizacoes_ativas")
      .select("user_id, latitude, longitude, peregrinacoes!inner(status)")
      .eq("peregrinacoes.status", "em_andamento"),
  ]);
  const localizacoes = (localizacoesData ?? []).map((l) => ({
    user_id: l.user_id,
    latitude: l.latitude,
    longitude: l.longitude,
  }));

  let peregrinosCadastrados: PeregrinoLinha[] = [];
  let peregrinosAtivos: PeregrinoLinha[] = [];
  let peregrinacoesIniciadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesPlanejadas: PeregrinacaoLinha[] = [];
  let peregrinacoesPlanejadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesTerminadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasTotal: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasSemSucesso: PeregrinacaoLinha[] = [];
  let papCadastrados: PapLinha[] = [];
  let papAtivos: PapLinha[] = [];
  let papPendentes: PapLinha[] = [];
  let papConfirmados: PapLinha[] = [];
  let papVinculados: PapLinha[] = [];
  let riscosCadastrados: RiscoLinha[] = [];
  let riscosInformados: RiscoInformadoLinha[] = [];
  let gerentesCadastrados: GerenteLinha[] = [];
  let romariasGrupo: RomariaGrupoLinha[] = [];
  let mensagensNovas = 0;
  let avisos: RiscoInformado[] = [];
  // Rodada 41 — null quando a função cadastros_admin() ainda não existe no
  // banco (Migration 39 não aplicada): o painel mostra um aviso em vez dos
  // contadores, sem quebrar o resto da página.
  let cadastros: CadastroLinha[] | null = null;
  let cadastrosNovos7d: CadastroLinha[] = [];
  // Rodada 44 — PAP do pré-cadastro (sem gerente) ativos hoje, já com
  // posição no mapa, para o filtro "PAP ativos" do mapa do painel bater com
  // o contador "Ativos" (que desde a Rodada 37 conta esses também).
  let papsPreCadastroAtivosMapa: PapPreCadastroMapa[] = [];
  // Rodada 50 — contador de acessos ao site (Migration 44).
  let acessos: EstatisticasAcessos | null = null;

  if (isAdmin) {
    const [
      { data: todosPerfis },
      { data: gerentes },
      { data: todasPeregrinacoes },
      { data: rotas },
      { data: certificados },
      { data: informados },
      { data: romariasGrupoData },
      { count: contagemMensagensNovas },
      { data: preCadastro },
      { data: cadastrosData, error: erroCadastros },
      { data: pontosCheckinData },
      { data: basePreCadastroCidadeKm },
      { data: acessosData, error: erroAcessos },
    ] = await Promise.all([
      supabase.from("profiles").select("id, nome_completo, cidade, uf, is_admin, is_agente"),
      supabase.from("gerentes_pap").select("id, nome_completo, telefone, nome_organizacao, status, criado_em"),
      supabase.from("peregrinacoes").select("*").order("criado_em", { ascending: false }),
      supabase.from("rotas").select("*"),
      supabase.from("certificados").select("peregrinacao_id"),
      supabase.from("riscos_informados").select("*").order("criado_em", { ascending: false }),
      supabase.from("romarias_grupo").select("*").order("data_inicio", { ascending: true }),
      supabase.from("mensagens_contato").select("id", { count: "exact", head: true }).eq("status", "novo"),
      // Rodada 36 — usada para "PAP Cadastrados" contar também as entradas
      // da base de pré-cadastro (paps_pre_cadastro) ainda sem gerente
      // vinculado (reivindicado_por nulo), que não têm nenhuma linha em
      // pontos_apoio e por isso ficavam de fora do contador (bug relatado:
      // mostrava só 1, quando deveria contar "todos que já foram
      // cadastrados, mesmo os sem vinculação"). "PAP Ativos" continua sem
      // usar isso — só pontos_apoio de verdade (aprovado/ativo) contam como
      // ativo no painel do admin, ver papAtivos abaixo.
      supabase
        .from("paps_pre_cadastro")
        .select("*")
        .is("reivindicado_por", null),
      // Rodada 41 — contas de acesso (auth.users), só visível para admin
      // (ver cadastros_admin() na Migration 39).
      supabase.rpc("cadastros_admin"),
      // Rodada 44 — âncoras para posicionar no mapa os PAP do pré-cadastro
      // ativos hoje (mesmo cálculo do /mapa, ver lib/pap-pre-cadastro-mapa).
      supabase.from("pontos_checkin").select("*").order("ordem"),
      supabase.from("paps_pre_cadastro").select("cidade, km"),
      supabase.rpc("estatisticas_acessos"),
    ]);
    acessos = erroAcessos ? null : ((acessosData ?? null) as EstatisticasAcessos | null);

    papsPreCadastroAtivosMapa = posicionarPapsPreCadastro({
      paps: ((preCadastro ?? []) as PapPreCadastro[]).filter((p) => papAtivoHoje(p.datas_funcionamento)),
      baseCidadeKm: (basePreCadastroCidadeKm ?? []) as { cidade: string | null; km: number | null }[],
      rotas: (rotas ?? []) as Rota[],
      pontosCheckin: (pontosCheckinData ?? []) as PontoCheckin[],
    });

    if (!erroCadastros) {
      interface CadastroBruto {
        id: string;
        email: string | null;
        nome: string | null;
        telefone: string | null;
        tipo_conta: string | null;
        criado_em: string;
        confirmado: boolean;
        via_google: boolean;
      }
      cadastros = ((cadastrosData ?? []) as CadastroBruto[]).map(
        (c): CadastroLinha => ({
          id: c.id,
          nome: c.nome ?? "(sem nome)",
          email: c.email ?? "",
          telefone: c.telefone,
          tipoConta: c.tipo_conta,
          criadoEm: c.criado_em,
          confirmado: c.confirmado,
          viaGoogle: c.via_google,
        })
      );
      cadastrosNovos7d = cadastros.filter((c) => criadoNosUltimos7Dias(c.criadoEm));
    }

    mensagensNovas = contagemMensagensNovas ?? 0;
    avisos = ((informados ?? []) as RiscoInformado[]).filter(avisoVisivelPublicamente);

    romariasGrupo = ((romariasGrupoData ?? []) as RomariaGrupo[]).map(
      (r): RomariaGrupoLinha => ({
        id: r.id,
        nome: r.nome,
        cidadeOrigem: r.cidade_origem,
        quantidade: r.quantidade,
        dataInicio: r.data_inicio,
        previsaoDias: r.previsao_dias,
        organizadorNome: r.organizador_nome,
        exibirOrganizador: r.exibir_organizador,
        organizadorTelefone: r.organizador_telefone,
        exibirTelefone: r.exibir_telefone,
        meioDeslocamento: r.meio_deslocamento,
        meioDeslocamentoOutroDesc: r.meio_deslocamento_outro_desc,
        status: r.status,
        criadoEm: r.criado_em,
      })
    );

    interface PerfilBasico {
      id: string;
      nome_completo: string;
      cidade: string | null;
      uf: string | null;
      is_admin: boolean;
      is_agente: boolean;
    }

    const perfilPorId = new Map(((todosPerfis ?? []) as PerfilBasico[]).map((p) => [p.id, p]));
    // Rodada 24: antes excluía daqui qualquer conta que também fosse
    // gerente de PAP ("peregrino OU gerente+peregrino", nas palavras do
    // usuário — as duas contam como cadastradas). Continua excluindo só
    // quem é administrador/agente da própria equipe, que não é "um
    // peregrino cadastrado" nesse sentido.
    const peregrinoProfiles = ((todosPerfis ?? []) as PerfilBasico[]).filter(
      (p) => !p.is_admin && !p.is_agente
    );

    const nomeDaRota = new Map(((rotas ?? []) as Rota[]).map((r) => [r.id, nomeRota(r)]));
    const nomeDoGerente = new Map(
      (gerentes ?? []).map((g) => [g.id as string, g.nome_completo as string])
    );

    riscosCadastrados = ((pontosRisco ?? []) as PontoRisco[]).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      nivelRisco: r.nivel_risco,
      kmReferencia: r.km_referencia,
      sentido: r.sentido,
      rotaNome: r.rota_id ? nomeDaRota.get(r.rota_id) ?? null : null,
    }));

    riscosInformados = ((informados ?? []) as RiscoInformado[]).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao,
      categoria: r.categoria,
      tipo: r.tipo,
      nivelRisco: r.nivel_risco,
      latitude: r.latitude,
      longitude: r.longitude,
      kmReferencia: r.km_referencia,
      rotaId: r.rota_id,
      rotaNome: r.rota_id ? nomeDaRota.get(r.rota_id) ?? null : null,
      nomeInformante: perfilPorId.get(r.user_id)?.nome_completo ?? "Peregrino",
      status: r.status,
      criadoEm: r.criado_em,
    }));

    const peregrinacoes = (todasPeregrinacoes ?? []) as Peregrinacao[];
    const peregrinacaoIds = peregrinacoes.map((p) => p.id);
    const { data: checkins } = peregrinacaoIds.length
      ? await supabase.from("checkins").select("peregrinacao_id").in("peregrinacao_id", peregrinacaoIds)
      : { data: [] as { peregrinacao_id: string }[] };
    const contagemCheckins = new Map<string, number>();
    (checkins ?? []).forEach((c) => {
      contagemCheckins.set(c.peregrinacao_id, (contagemCheckins.get(c.peregrinacao_id) ?? 0) + 1);
    });

    const idsComCertificado = new Set((certificados ?? []).map((c) => c.peregrinacao_id as string));

    // Última peregrinação (qualquer status) de cada peregrino cadastrado —
    // usada no grupo "Peregrinos" (visão por pessoa).
    const ultimaPeregrinacaoPorUsuario = new Map<string, Peregrinacao>();
    peregrinacoes.forEach((p) => {
      if (!ultimaPeregrinacaoPorUsuario.has(p.user_id)) {
        ultimaPeregrinacaoPorUsuario.set(p.user_id, p);
      }
    });

    function linhaDoPerfil(perfilPeregrino: PerfilBasico): PeregrinoLinha {
      const p = ultimaPeregrinacaoPorUsuario.get(perfilPeregrino.id);
      const local = perfilPeregrino.cidade
        ? `${perfilPeregrino.cidade}${perfilPeregrino.uf ? `/${perfilPeregrino.uf}` : ""}`
        : "não informado";
      if (!p) {
        return {
          id: perfilPeregrino.id,
          nome: perfilPeregrino.nome_completo,
          status: "sem_peregrinacao",
          local,
          meioTransporte: null,
          rotaNome: null,
          dataInicio: null,
          dataFim: null,
          checkinsCount: 0,
        };
      }
      return {
        id: p.id,
        nome: perfilPeregrino.nome_completo,
        status: p.status === "concluida" ? "concluida" : p.status === "em_andamento" ? "em_andamento" : "sem_peregrinacao",
        local,
        meioTransporte: (p.meio_transporte as MeioTransporte) ?? null,
        meioTransporteOutroDesc: p.meio_transporte_outro_desc,
        rotaNome: p.rota_id ? nomeDaRota.get(p.rota_id) ?? null : null,
        dataInicio: p.data_inicio,
        dataFim: p.data_fim,
        checkinsCount: contagemCheckins.get(p.id) ?? 0,
      };
    }

    // Rodada 26: "Cadastrados" precisa contar TODOS os usuários cadastrados
    // no app em geral — antes ficava restrito a quem tem uma linha em
    // "profiles" com o papel de peregrino, o que deixava de fora contas de
    // gerente de PAP que nunca chegaram a criar um perfil de peregrino.
    // "Ativos" continua sendo só quem já deu início a uma peregrinação
    // (status em_andamento) — isso já estava correto desde a Rodada 24.
    const idsComPerfilPeregrino = new Set(peregrinoProfiles.map((p) => p.id));
    const gerentesSemPerfilPeregrino = ((gerentes ?? []) as GerenteBasico[]).filter(
      (g) => !idsComPerfilPeregrino.has(g.id)
    );
    const linhasGerentesSemPerfil: PeregrinoLinha[] = gerentesSemPerfilPeregrino.map((g) => ({
      id: g.id,
      nome: g.nome_completo,
      status: "sem_peregrinacao",
      local: "Gerente de PAP (sem perfil de peregrino)",
      meioTransporte: null,
      rotaNome: null,
      dataInicio: null,
      dataFim: null,
      checkinsCount: 0,
    }));

    peregrinosCadastrados = [...peregrinoProfiles.map(linhaDoPerfil), ...linhasGerentesSemPerfil];
    peregrinosAtivos = peregrinosCadastrados.filter((l) => l.status === "em_andamento");

    // Grupo "Peregrinações" — visão por jornada (uma pessoa pode ter mais
    // de uma peregrinação ao longo do tempo).
    function linhaDaPeregrinacao(p: Peregrinacao): PeregrinacaoLinha {
      const perfilPeregrino = perfilPorId.get(p.user_id);
      const local = perfilPeregrino?.cidade
        ? `${perfilPeregrino.cidade}${perfilPeregrino.uf ? `/${perfilPeregrino.uf}` : ""}`
        : "não informado";
      return {
        id: p.id,
        nome: perfilPeregrino?.nome_completo ?? "—",
        local,
        // Rodada 56 — cidade de onde a peregrinação sai (mais útil para o
        // adm do que o nome da rota, a pedido do usuário).
        origem: p.cidade_origem ?? p.cidade_inicio ?? null,
        status: p.status,
        rotaNome: p.rota_id ? nomeDaRota.get(p.rota_id) ?? null : null,
        meioTransporte: (p.meio_transporte as MeioTransporte) ?? null,
        meioTransporteOutroDesc: p.meio_transporte_outro_desc,
        dataInicioPrevista: p.data_inicio_prevista,
        dataInicio: p.data_inicio,
        dataFim: p.data_fim,
        checkinsCount: contagemCheckins.get(p.id) ?? 0,
        temCertificado: idsComCertificado.has(p.id),
      };
    }

    const todasLinhasPeregrinacao = peregrinacoes.map(linhaDaPeregrinacao);
    peregrinacoesIniciadasHoje = todasLinhasPeregrinacao.filter((p) => ehHoje(p.dataInicio));
    peregrinacoesPlanejadas = todasLinhasPeregrinacao.filter((p) => p.status === "planejada");
    // Rodada 28, corrigindo bug relatado pelo usuário: antes este contador
    // partia de "peregrinacoesPlanejadas" (só quem ainda está com status
    // "planejada"), então cada pessoa que apertava "iniciar" saía da conta
    // NO MESMO DIA em que tinha planejado — o número ia diminuindo ao longo
    // do dia, quando o esperado é mostrar todo mundo que planejou começar
    // hoje, e esse total não diminuir conforme elas vão de fato começando
    // (ou até concluindo) a peregrinação no mesmo dia.
    peregrinacoesPlanejadasHoje = todasLinhasPeregrinacao.filter((p) => ehHoje(p.dataInicioPrevista));
    peregrinacoesTerminadasHoje = todasLinhasPeregrinacao.filter(
      (p) => p.dataFim && ehHoje(p.dataFim)
    );
    peregrinacoesConcluidasHoje = peregrinacoesTerminadasHoje.filter((p) => p.temCertificado);
    // "Concluídas com sucesso" (Rodada 28, renomeado de "concluídas total" a
    // pedido do usuário) = terminou E recebeu certificado. Quem terminou mas
    // NÃO recebeu certificado (ex.: não fez o check-in inicial fora de
    // Aparecida, ou faltou o check-in final) cai em "concluídas sem
    // sucesso", um novo módulo para a administração revisar reclamações e,
    // se fizer sentido, liberar o certificado manualmente.
    peregrinacoesConcluidasTotal = todasLinhasPeregrinacao.filter((p) => p.temCertificado);
    peregrinacoesConcluidasSemSucesso = todasLinhasPeregrinacao.filter(
      (p) => p.status === "concluida" && !p.temCertificado
    );

    const papRows = ((pontosApoio ?? []) as PontoApoio[]).map(
      (p): PapLinha => ({
        id: p.id,
        nome: p.nome,
        cidade: p.cidade,
        kmReferencia: p.km_referencia,
        sentidoPista: p.sentido_pista,
        statusAprovacao: p.status_aprovacao,
        ativo: p.ativo,
        datasFuncionamento: p.datas_funcionamento,
        gerenteNome: p.gerente_id ? nomeDoGerente.get(p.gerente_id) ?? null : null,
        vinculadoPreCadastro: p.pre_cadastro_id != null,
        criadoEm: p.criado_em,
      })
    );

    // Rodada 36 — entradas do pré-cadastro ainda sem gerente (a query acima
    // já filtra reivindicado_por nulo) viram linhas "fake" para a lista de
    // Cadastrados, com o pseudo-status pre_cadastro_sem_gerente (ver
    // STATUS_PAP_LABELS). Rodada 37, a pedido do usuário: "PAP ativo" é
    // definido só pela data de funcionamento bater com hoje — não precisa
    // estar vinculado a um gerente nem aprovado pela administração para
    // contar (só o que muda, ao ser vinculado e aprovado, é aparecer em
    // verde no mapa com os dados confirmados pelo gerente). Por isso estas
    // linhas entram em papAtivos também (`ativo: true` aqui não é um campo
    // real — pré-cadastro não tem esse toggle — só computado como sempre
    // "elegível", já que quem decide se conta é só a data). Continuam de
    // fora de papPendentes/papVinculados, que são conceitos exclusivos de
    // pontos_apoio de verdade.
    interface PreCadastroBasico {
      id: string;
      nome: string;
      cidade: string | null;
      km: number | null;
      sentido_pista: string | null;
      datas_funcionamento: string[];
      criado_em: string;
    }
    const preCadastroRows = ((preCadastro ?? []) as PreCadastroBasico[]).map(
      (p): PapLinha => ({
        id: p.id,
        nome: p.nome,
        cidade: p.cidade,
        kmReferencia: p.km,
        sentidoPista: p.sentido_pista,
        statusAprovacao: "pre_cadastro_sem_gerente",
        ativo: true,
        datasFuncionamento: p.datas_funcionamento,
        gerenteNome: null,
        vinculadoPreCadastro: false,
        criadoEm: p.criado_em,
      })
    );

    papCadastrados = [...papRows, ...preCadastroRows];
    // Rodada 24: "Ativos" usava aberto_agora (alternado manualmente pelo
    // gerente, sem relação com o calendário) — por isso um PAP com a data de
    // hoje removida do calendário continuava contando como ativo aqui,
    // mesmo já tendo sumido do filtro "PAP ativos agora" do mapa público
    // (bug relatado pelo usuário). Agora usa o mesmo critério por data.
    // Rodada 37 — a pedido do usuário: tirado o filtro por status_aprovacao
    // (um PAP pendente de revisão, com a data de hoje marcada, já conta como
    // ativo — só o selo verde no mapa depende de estar aprovado) e somadas
    // as entradas do pré-cadastro sem gerente, mesmo critério do contador
    // público da home (estatisticas_publicas() no banco).
    papAtivos = [
      ...papRows.filter((p) => p.ativo && papAtivoHoje(p.datasFuncionamento)),
      ...preCadastroRows.filter((p) => papAtivoHoje(p.datasFuncionamento)),
    ];
    papPendentes = papRows.filter((p) => p.statusAprovacao === "pendente");
    // Rodada 39 — corrige bug relatado pelo usuário: existia um PAP vinculado
    // a um gerente e aprovado, aparecendo em verde ("Confirmado / vinculado a
    // um gerente") no mapa público, mas o painel do admin mostrava "0" em
    // Vinculados. Causa raiz: o card "Vinculados" nunca teve esse
    // significado — ele sempre contou `pre_cadastro_id != null`, ou seja, só
    // os PAP que nasceram de alguém reivindicando uma linha da lista pública
    // pré-cadastrada (ver comentário da Rodada 36/37 acima e o próprio título
    // do drilldown, "PAP vinculados da lista pública pré-cadastrada") — um
    // PAP cadastrado do zero pelo gerente (sem passar pelo pré-cadastro,
    // como era o caso do PAP relatado) nunca entra nessa conta, mesmo
    // "vinculado a um gerente" e aprovado. Esse é um contador legítimo, só
    // com um nome ambíguo — mantido como está (renomeado no drilldown para
    // deixar claro que é sobre a lista pública), e criado aqui um novo
    // contador "Confirmados" com o MESMO critério que pinta o marcador de
    // verde no mapa (/mapa/page.tsx: `status_aprovacao = 'aprovado'`, sem
    // checar pre_cadastro_id nem gerente_id) — este sim reflete o que o
    // usuário e a legenda do mapa chamam de "vinculado".
    papConfirmados = papRows.filter((p) => p.statusAprovacao === "aprovado");
    papVinculados = papRows.filter((p) => p.vinculadoPreCadastro);

    // Nome(s) do(s) PAP de cada gerente — mesma lógica do /admin/gerentes,
    // repetida aqui para o Painel também trazer nome, telefone e PAP juntos
    // (antes só existia essa informação completa na tela separada).
    const papsDoGerentePorId = new Map<string, string[]>();
    ((pontosApoio ?? []) as PontoApoio[]).forEach((p) => {
      if (!p.gerente_id) return;
      const lista = papsDoGerentePorId.get(p.gerente_id) ?? [];
      lista.push(p.nome);
      papsDoGerentePorId.set(p.gerente_id, lista);
    });

    interface GerenteBasico {
      id: string;
      nome_completo: string;
      telefone: string;
      nome_organizacao: string | null;
      status: string;
      criado_em: string;
    }

    gerentesCadastrados = ((gerentes ?? []) as GerenteBasico[]).map(
      (g): GerenteLinha => ({
        id: g.id,
        nome: g.nome_completo,
        telefone: g.telefone,
        nomeOrganizacao: g.nome_organizacao,
        status: g.status,
        papNomes: papsDoGerentePorId.get(g.id) ?? [],
        criadoEm: g.criado_em,
      })
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <VoltarButton href="/" />

      {isAdmin && <AcessosSiteResumo dados={acessos} />}

      {isAdmin && (
        <AdminDrilldownClient
          peregrinosCadastrados={peregrinosCadastrados}
          peregrinosAtivos={peregrinosAtivos}
          peregrinacoesIniciadasHoje={peregrinacoesIniciadasHoje}
          peregrinacoesPlanejadas={peregrinacoesPlanejadas}
          peregrinacoesPlanejadasHoje={peregrinacoesPlanejadasHoje}
          peregrinacoesConcluidasHoje={peregrinacoesConcluidasHoje}
          peregrinacoesConcluidasTotal={peregrinacoesConcluidasTotal}
          peregrinacoesConcluidasSemSucesso={peregrinacoesConcluidasSemSucesso}
          papCadastrados={papCadastrados}
          papAtivos={papAtivos}
          papPendentes={papPendentes}
          papConfirmados={papConfirmados}
          papVinculados={papVinculados}
          riscosCadastrados={riscosCadastrados}
          riscosInformados={riscosInformados}
          gerentesCadastrados={gerentesCadastrados}
          romariasGrupo={romariasGrupo}
          mensagensNovas={mensagensNovas}
          cadastros={cadastros}
          cadastrosNovos7d={cadastrosNovos7d}
        />
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
          Mapa geral — PAP ativos, riscos, avisos de peregrinos e peregrinos em caminhada
        </h2>
        <AdminMapClient
          pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
          pontosRisco={(pontosRisco ?? []) as PontoRisco[]}
          avisos={avisos}
          peregrinos={localizacoes ?? []}
          podeEditarPap={isAdmin}
          papsPreCadastroAtivos={papsPreCadastroAtivosMapa}
        />
      </section>
    </div>
  );
}
