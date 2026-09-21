import { createClient } from "@/lib/supabase/server";
import { nomeRota, avisoVisivelPublicamente, papAtivoHoje } from "@/lib/constants";
import AdminMapClient from "./AdminMapClient";
import AdminDrilldownClient, {
  type PeregrinoLinha,
  type PeregrinacaoLinha,
  type PapLinha,
  type RiscoLinha,
  type RiscoInformadoLinha,
  type GerenteLinha,
  type RomariaGrupoLinha,
} from "./AdminDrilldownClient";
import VoltarButton from "@/components/VoltarButton";
import type {
  PontoApoio,
  PontoRisco,
  Rota,
  MeioTransporte,
  Peregrinacao,
  RiscoInformado,
  RomariaGrupo,
} from "@/types/database";

function ehHoje(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
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
  const [{ data: pontosApoio }, { data: pontosRisco }, { data: localizacoes }] = await Promise.all([
    supabase.from("pontos_apoio").select("*"),
    supabase.from("pontos_risco").select("*"),
    supabase.from("localizacoes_ativas").select("user_id, latitude, longitude"),
  ]);

  let peregrinosCadastrados: PeregrinoLinha[] = [];
  let peregrinosAtivos: PeregrinoLinha[] = [];
  let peregrinacoesIniciadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesPlanejadas: PeregrinacaoLinha[] = [];
  let peregrinacoesPlanejadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesTerminadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasTotal: PeregrinacaoLinha[] = [];
  let papCadastrados: PapLinha[] = [];
  let papAtivos: PapLinha[] = [];
  let papPendentes: PapLinha[] = [];
  let papVinculados: PapLinha[] = [];
  let riscosCadastrados: RiscoLinha[] = [];
  let riscosInformados: RiscoInformadoLinha[] = [];
  let gerentesCadastrados: GerenteLinha[] = [];
  let romariasGrupo: RomariaGrupoLinha[] = [];
  let mensagensNovas = 0;
  let avisos: RiscoInformado[] = [];

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
    ] = await Promise.all([
      supabase.from("profiles").select("id, nome_completo, cidade, uf, is_admin, is_agente"),
      supabase.from("gerentes_pap").select("id, nome_completo, telefone, nome_organizacao, status, criado_em"),
      supabase.from("peregrinacoes").select("*").order("criado_em", { ascending: false }),
      supabase.from("rotas").select("*"),
      supabase.from("certificados").select("peregrinacao_id"),
      supabase.from("riscos_informados").select("*").order("criado_em", { ascending: false }),
      supabase.from("romarias_grupo").select("*").order("data_inicio", { ascending: true }),
      supabase.from("mensagens_contato").select("id", { count: "exact", head: true }).eq("status", "novo"),
    ]);

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
    peregrinacoesPlanejadasHoje = peregrinacoesPlanejadas.filter((p) => ehHoje(p.dataInicioPrevista));
    peregrinacoesTerminadasHoje = todasLinhasPeregrinacao.filter(
      (p) => p.dataFim && ehHoje(p.dataFim)
    );
    peregrinacoesConcluidasHoje = peregrinacoesTerminadasHoje.filter((p) => p.temCertificado);
    peregrinacoesConcluidasTotal = todasLinhasPeregrinacao.filter((p) => p.temCertificado);

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

    papCadastrados = papRows;
    // Rodada 24: "Ativos" usava aberto_agora (alternado manualmente pelo
    // gerente, sem relação com o calendário) — por isso um PAP com a data de
    // hoje removida do calendário continuava contando como ativo aqui,
    // mesmo já tendo sumido do filtro "PAP ativos agora" do mapa público
    // (bug relatado pelo usuário). Agora usa o mesmo critério por data.
    papAtivos = papRows.filter(
      (p) => p.ativo && p.statusAprovacao === "aprovado" && papAtivoHoje(p.datasFuncionamento)
    );
    papPendentes = papRows.filter((p) => p.statusAprovacao === "pendente");
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

      {isAdmin && (
        <AdminDrilldownClient
          peregrinosCadastrados={peregrinosCadastrados}
          peregrinosAtivos={peregrinosAtivos}
          peregrinacoesIniciadasHoje={peregrinacoesIniciadasHoje}
          peregrinacoesPlanejadas={peregrinacoesPlanejadas}
          peregrinacoesPlanejadasHoje={peregrinacoesPlanejadasHoje}
          peregrinacoesConcluidasHoje={peregrinacoesConcluidasHoje}
          peregrinacoesConcluidasTotal={peregrinacoesConcluidasTotal}
          papCadastrados={papCadastrados}
          papAtivos={papAtivos}
          papPendentes={papPendentes}
          papVinculados={papVinculados}
          riscosCadastrados={riscosCadastrados}
          riscosInformados={riscosInformados}
          gerentesCadastrados={gerentesCadastrados}
          romariasGrupo={romariasGrupo}
          mensagensNovas={mensagensNovas}
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
        />
      </section>
    </div>
  );
}
