import { createClient } from "@/lib/supabase/server";
import AdminMapClient from "./AdminMapClient";
import AdminDrilldownClient, {
  type PeregrinoLinha,
  type PeregrinacaoLinha,
  type PapLinha,
  type RiscoLinha,
  type RiscoInformadoLinha,
} from "./AdminDrilldownClient";
import VoltarButton from "@/components/VoltarButton";
import type {
  PontoApoio,
  PontoRisco,
  Rota,
  MeioTransporte,
  Peregrinacao,
  RiscoInformado,
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

  const [{ data: pontosApoio }, { data: pontosRisco }, { data: localizacoes }] = await Promise.all([
    supabase.from("pontos_apoio").select("*"),
    supabase.from("pontos_risco").select("*"),
    supabase.from("localizacoes_ativas").select("user_id, latitude, longitude"),
  ]);

  let peregrinosCadastrados: PeregrinoLinha[] = [];
  let peregrinosAtivos: PeregrinoLinha[] = [];
  let peregrinacoesIniciadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesTerminadasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasHoje: PeregrinacaoLinha[] = [];
  let peregrinacoesConcluidasTotal: PeregrinacaoLinha[] = [];
  let papCadastrados: PapLinha[] = [];
  let papAtivos: PapLinha[] = [];
  let papPendentes: PapLinha[] = [];
  let riscosCadastrados: RiscoLinha[] = [];
  let riscosInformados: RiscoInformadoLinha[] = [];

  if (isAdmin) {
    const [
      { data: todosPerfis },
      { data: gerentes },
      { data: todasPeregrinacoes },
      { data: rotas },
      { data: certificados },
      { data: informados },
    ] = await Promise.all([
      supabase.from("profiles").select("id, nome_completo, cidade, uf"),
      supabase.from("gerentes_pap").select("id, nome_completo"),
      supabase.from("peregrinacoes").select("*").order("criado_em", { ascending: false }),
      supabase.from("rotas").select("*"),
      supabase.from("certificados").select("peregrinacao_id"),
      supabase.from("riscos_informados").select("*").order("criado_em", { ascending: false }),
    ]);

    interface PerfilBasico {
      id: string;
      nome_completo: string;
      cidade: string | null;
      uf: string | null;
    }

    const idsGerentes = new Set((gerentes ?? []).map((g) => g.id as string));
    const perfilPorId = new Map(((todosPerfis ?? []) as PerfilBasico[]).map((p) => [p.id, p]));
    const peregrinoProfiles = ((todosPerfis ?? []) as PerfilBasico[]).filter(
      (p) => !idsGerentes.has(p.id)
    );

    const nomeDaRota = new Map(((rotas ?? []) as Rota[]).map((r) => [r.id, r.nome]));
    const nomeDoGerente = new Map(
      (gerentes ?? []).map((g) => [g.id as string, g.nome_completo as string])
    );

    riscosCadastrados = ((pontosRisco ?? []) as PontoRisco[]).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      nivelRisco: r.nivel_risco,
      kmReferencia: r.km_referencia,
      rotaNome: r.rota_id ? nomeDaRota.get(r.rota_id) ?? null : null,
    }));

    riscosInformados = ((informados ?? []) as RiscoInformado[]).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao,
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

    peregrinosCadastrados = peregrinoProfiles.map(linhaDoPerfil);
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
        rotaNome: p.rota_id ? nomeDaRota.get(p.rota_id) ?? null : null,
        meioTransporte: (p.meio_transporte as MeioTransporte) ?? null,
        meioTransporteOutroDesc: p.meio_transporte_outro_desc,
        dataInicio: p.data_inicio,
        dataFim: p.data_fim,
        checkinsCount: contagemCheckins.get(p.id) ?? 0,
        temCertificado: idsComCertificado.has(p.id),
      };
    }

    const todasLinhasPeregrinacao = peregrinacoes.map(linhaDaPeregrinacao);
    peregrinacoesIniciadasHoje = todasLinhasPeregrinacao.filter((p) => ehHoje(p.dataInicio));
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
        abertoAgora: p.aberto_agora,
        gerenteNome: p.gerente_id ? nomeDoGerente.get(p.gerente_id) ?? null : null,
        criadoEm: p.criado_em,
      })
    );

    papCadastrados = papRows;
    papAtivos = papRows.filter((p) => p.abertoAgora && p.statusAprovacao === "aprovado");
    papPendentes = papRows.filter((p) => p.statusAprovacao === "pendente");
  }

  return (
    <div className="flex flex-col gap-6">
      <VoltarButton href="/" />

      {isAdmin && (
        <AdminDrilldownClient
          peregrinosCadastrados={peregrinosCadastrados}
          peregrinosAtivos={peregrinosAtivos}
          peregrinacoesIniciadasHoje={peregrinacoesIniciadasHoje}
          peregrinacoesConcluidasHoje={peregrinacoesConcluidasHoje}
          peregrinacoesConcluidasTotal={peregrinacoesConcluidasTotal}
          papCadastrados={papCadastrados}
          papAtivos={papAtivos}
          papPendentes={papPendentes}
          riscosCadastrados={riscosCadastrados}
          riscosInformados={riscosInformados}
        />
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
          Mapa geral — PAP, riscos e peregrinos em caminhada
        </h2>
        <AdminMapClient
          pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
          pontosRisco={(pontosRisco ?? []) as PontoRisco[]}
          peregrinos={localizacoes ?? []}
        />
      </section>
    </div>
  );
}
