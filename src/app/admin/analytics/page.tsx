import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nomeRota } from "@/lib/constants";
import VoltarButton from "@/components/VoltarButton";
import AdminAnalyticsClient, {
  type PeregrinacaoAnalytics,
  type CheckinAnalytics,
  type PapAnalytics,
  type RiscoCadastradoAnalytics,
  type RiscoInformadoAnalytics,
} from "./AdminAnalyticsClient";
import type {
  Peregrinacao,
  Rota,
  PontoApoio,
  PontoRisco,
  RiscoInformado,
} from "@/types/database";

// Dashboard de métricas (Rodada 32, a pedido do usuário: "criar um
// dashboard para o adm com possibilidade visual de várias métricas,
// filtros, dias, dos peregrinos, dos PAPs, cidades, lado da rodovia, qual
// caminho mais passam, de que lado, horário que mais se movimentam") —
// página só de leitura/visualização, com filtros de período e rota
// aplicados no navegador (o volume de dados do app não justifica reconsultar
// o banco a cada troca de filtro). Exclusiva do administrador (o layout de
// /admin já libera para admin OU agente, então esta página confere de novo
// por conta própria, seguindo o mesmo padrão comentado em admin/layout.tsx).
export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/analytics");

  const { data: perfilLogado } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfilLogado?.is_admin) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin" />
        <p className="text-neutral-500">
          Esta página é exclusiva do administrador.
        </p>
      </div>
    );
  }

  const [
    { data: perfisData },
    { data: peregrinacoesData },
    { data: checkinsData },
    { data: rotasData },
    { data: pontosApoioData },
    { data: pontosRiscoData },
    { data: riscosInformadosData },
    { data: certificadosData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, cidade, uf, motivo, motivo_outro_desc, religiao, sexo, data_nascimento, ja_fez_trajeto, tem_acompanhamento_carro_apoio, is_admin, is_agente, criado_em"
      ),
    supabase.from("peregrinacoes").select("*"),
    supabase.from("checkins").select("id, peregrinacao_id, criado_em"),
    supabase.from("rotas").select("*"),
    supabase.from("pontos_apoio").select("*"),
    supabase.from("pontos_risco").select("*"),
    supabase.from("riscos_informados").select("*"),
    supabase.from("certificados").select("peregrinacao_id"),
  ]);

  const rotas = (rotasData ?? []) as Rota[];
  const nomeDaRotaPorId = new Map(rotas.map((r) => [r.id, nomeRota(r)]));
  const slugDaRotaPorId = new Map(rotas.map((r) => [r.id, r.slug]));

  interface PerfilAnalytics {
    id: string;
    cidade: string | null;
    uf: string | null;
    motivo: string | null;
    motivo_outro_desc: string | null;
    religiao: string | null;
    sexo: string | null;
    data_nascimento: string | null;
    ja_fez_trajeto: boolean;
    tem_acompanhamento_carro_apoio: boolean;
    is_admin: boolean;
    is_agente: boolean;
    criado_em: string;
  }

  const perfis = (perfisData ?? []) as PerfilAnalytics[];
  const perfilPorId = new Map(perfis.map((p) => [p.id, p]));
  const idsComCertificado = new Set(
    (certificadosData ?? []).map((c) => c.peregrinacao_id as string)
  );

  const peregrinacoes: PeregrinacaoAnalytics[] = ((peregrinacoesData ?? []) as Peregrinacao[]).map(
    (p) => {
      const perfil = perfilPorId.get(p.user_id);
      return {
        id: p.id,
        userId: p.user_id,
        status: p.status,
        rotaSlug: p.rota_id ? slugDaRotaPorId.get(p.rota_id) ?? null : null,
        rotaNome: p.rota_id ? nomeDaRotaPorId.get(p.rota_id) ?? null : null,
        meioTransporte: p.meio_transporte,
        cidadeOrigem: p.cidade_origem ?? p.cidade_inicio,
        dataInicioPrevista: p.data_inicio_prevista,
        dataInicio: p.data_inicio,
        dataFim: p.data_fim,
        diasPrevistos: p.dias_previstos,
        emGrupo: p.em_grupo,
        tamanhoGrupo: p.tamanho_grupo,
        criadoEm: p.criado_em,
        temCertificado: idsComCertificado.has(p.id),
        motivo: perfil?.motivo ?? null,
        religiao: perfil?.religiao ?? null,
        sexo: perfil?.sexo ?? null,
        dataNascimento: perfil?.data_nascimento ?? null,
        jaFezTrajeto: perfil?.ja_fez_trajeto ?? false,
        temAcompanhamentoCarroApoio: perfil?.tem_acompanhamento_carro_apoio ?? false,
        cidadePerfil: perfil?.cidade ?? null,
        ufPerfil: perfil?.uf ?? null,
      };
    }
  );

  // Peregrinações "de fato" — exclui contas de admin/agente da equipe, que
  // às vezes criam uma peregrinação de teste (mesmo critério já usado no
  // Painel principal para "peregrinos cadastrados").
  const peregrinacoesReais = peregrinacoes.filter((p) => {
    const perfil = perfilPorId.get(p.userId);
    return !perfil?.is_admin && !perfil?.is_agente;
  });

  const peregrinacaoIdsReais = new Set(peregrinacoesReais.map((p) => p.id));
  const checkins: CheckinAnalytics[] = ((checkinsData ?? []) as { id: string; peregrinacao_id: string; criado_em: string }[])
    .filter((c) => peregrinacaoIdsReais.has(c.peregrinacao_id))
    .map((c) => ({ id: c.id, peregrinacaoId: c.peregrinacao_id, criadoEm: c.criado_em }));

  const paps: PapAnalytics[] = ((pontosApoioData ?? []) as PontoApoio[]).map((p) => ({
    id: p.id,
    cidade: p.cidade,
    sentidoPista: p.sentido_pista,
    rotaSlug: p.rota_id ? slugDaRotaPorId.get(p.rota_id) ?? null : null,
    statusAprovacao: p.status_aprovacao,
    ativo: p.ativo,
    criadoEm: p.criado_em,
  }));

  const riscosCadastrados: RiscoCadastradoAnalytics[] = ((pontosRiscoData ?? []) as PontoRisco[]).map(
    (r) => ({
      id: r.id,
      tipo: r.tipo,
      sentido: r.sentido,
      rotaSlug: r.rota_id ? slugDaRotaPorId.get(r.rota_id) ?? null : null,
      nivelRisco: r.nivel_risco,
      criadoEm: r.criado_em,
    })
  );

  const riscosInformados: RiscoInformadoAnalytics[] = ((riscosInformadosData ?? []) as RiscoInformado[]).map(
    (r) => ({
      id: r.id,
      categoria: r.categoria,
      tipo: r.tipo,
      rotaSlug: r.rota_id ? slugDaRotaPorId.get(r.rota_id) ?? null : null,
      nivelRisco: r.nivel_risco,
      status: r.status,
      criadoEm: r.criado_em,
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <VoltarButton href="/admin" />
      <AdminAnalyticsClient
        peregrinacoes={peregrinacoesReais}
        checkins={checkins}
        paps={paps}
        riscosCadastrados={riscosCadastrados}
        riscosInformados={riscosInformados}
        rotas={rotas.map((r) => ({ slug: r.slug, nome: nomeDaRotaPorId.get(r.id) ?? r.nome }))}
      />
    </div>
  );
}
