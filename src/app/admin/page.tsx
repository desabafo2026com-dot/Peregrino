import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminMapClient from "./AdminMapClient";
import AdminDrilldownClient, { type PeregrinoLinha, type PapLinha, type RiscoLinha } from "./AdminDrilldownClient";
import VoltarButton from "@/components/VoltarButton";
import { CheckCircle2, UserCheck } from "lucide-react";
import type { PontoApoio, PontoRisco, Rota, MeioTransporte, Peregrinacao } from "@/types/database";

interface StatsAdmin {
  checkins_hoje: number;
  gerentes_pendentes: number;
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

  const [{ data: stats }, { data: pontosApoio }, { data: pontosRisco }, { data: localizacoes }] =
    await Promise.all([
      supabase.rpc("estatisticas_admin").maybeSingle() as unknown as Promise<{ data: StatsAdmin | null }>,
      supabase.from("pontos_apoio").select("*"),
      supabase.from("pontos_risco").select("*"),
      supabase.from("localizacoes_ativas").select("user_id, latitude, longitude"),
    ]);

  const cards = stats
    ? [
        { icon: CheckCircle2, label: "Check-ins hoje", value: stats.checkins_hoje },
        {
          icon: UserCheck,
          label: "Gerentes PAP pendentes",
          value: stats.gerentes_pendentes,
          href: "/admin/gerentes",
        },
      ]
    : [];

  let peregrinosPorAba: Record<"cadastrados" | "ativos" | "concluidos" | "concluidosHoje", PeregrinoLinha[]> = {
    cadastrados: [],
    ativos: [],
    concluidos: [],
    concluidosHoje: [],
  };
  let papPorAba: Record<"cadastrados" | "ativos" | "pendentes", PapLinha[]> = {
    cadastrados: [],
    ativos: [],
    pendentes: [],
  };
  let riscos: RiscoLinha[] = [];

  if (isAdmin) {
    const [{ data: todosPerfis }, { data: gerentes }, { data: todasPeregrinacoes }, { data: rotas }] =
      await Promise.all([
        supabase.from("profiles").select("id, nome_completo, cidade, uf"),
        supabase.from("gerentes_pap").select("id, nome_completo"),
        supabase
          .from("peregrinacoes")
          .select("*")
          .order("criado_em", { ascending: false }),
        supabase.from("rotas").select("*"),
      ]);
    const nomeDaRotaParaRiscos = new Map(((rotas ?? []) as Rota[]).map((r) => [r.id, r.nome]));
    riscos = ((pontosRisco ?? []) as PontoRisco[]).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      nivelRisco: r.nivel_risco,
      kmReferencia: r.km_referencia,
      rotaNome: r.rota_id ? nomeDaRotaParaRiscos.get(r.rota_id) ?? null : null,
    }));

    interface PerfilBasico {
      id: string;
      nome_completo: string;
      cidade: string | null;
      uf: string | null;
    }

    const idsGerentes = new Set((gerentes ?? []).map((g) => g.id as string));
    const peregrinoProfiles = ((todosPerfis ?? []) as PerfilBasico[]).filter(
      (p) => !idsGerentes.has(p.id)
    );

    const nomeDaRota = new Map(((rotas ?? []) as Rota[]).map((r) => [r.id, r.nome]));
    const nomeDoGerente = new Map(
      (gerentes ?? []).map((g) => [g.id as string, g.nome_completo as string])
    );

    const peregrinacoes = (todasPeregrinacoes ?? []) as Peregrinacao[];
    const peregrinacaoIds = peregrinacoes.map((p) => p.id);
    const { data: checkins } = peregrinacaoIds.length
      ? await supabase.from("checkins").select("peregrinacao_id").in("peregrinacao_id", peregrinacaoIds)
      : { data: [] as { peregrinacao_id: string }[] };
    const contagemCheckins = new Map<string, number>();
    (checkins ?? []).forEach((c) => {
      contagemCheckins.set(c.peregrinacao_id, (contagemCheckins.get(c.peregrinacao_id) ?? 0) + 1);
    });

    // Última peregrinação (qualquer status) de cada peregrino cadastrado.
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

    const cadastrados = peregrinoProfiles.map(linhaDoPerfil);
    const ativos = cadastrados.filter((l) => l.status === "em_andamento");
    const concluidos = cadastrados.filter((l) => l.status === "concluida");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const concluidosHoje = concluidos.filter(
      (l) => l.dataFim && new Date(l.dataFim) >= hoje
    );

    peregrinosPorAba = { cadastrados, ativos, concluidos, concluidosHoje };

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

    papPorAba = {
      cadastrados: papRows,
      ativos: papRows.filter((p) => p.abertoAgora && p.statusAprovacao === "aprovado"),
      pendentes: papRows.filter((p) => p.statusAprovacao === "pendente"),
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <VoltarButton href="/" />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) =>
          "href" in c && c.href ? (
            <Link key={c.label} href={c.href} className="card text-center transition hover:border-amber-300">
              <c.icon className="mx-auto mb-1 text-amber-700" size={20} />
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">{c.value}</p>
              <p className="text-xs text-neutral-500">{c.label}</p>
            </Link>
          ) : (
            <div key={c.label} className="card text-center">
              <c.icon className="mx-auto mb-1 text-amber-700" size={20} />
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">{c.value}</p>
              <p className="text-xs text-neutral-500">{c.label}</p>
            </div>
          )
        )}
        {!stats && (
          <p className="col-span-full text-sm text-neutral-400">
            Não foi possível carregar as estatísticas administrativas.
          </p>
        )}
      </section>

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

      {isAdmin && (
        <AdminDrilldownClient peregrinos={peregrinosPorAba} pap={papPorAba} riscos={riscos} />
      )}
    </div>
  );
}
