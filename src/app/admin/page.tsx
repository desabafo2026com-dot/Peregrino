import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminMapClient from "./AdminMapClient";
import PeregrinosAdminClient, { type PeregrinoLinha } from "./PeregrinosAdminClient";
import VoltarButton from "@/components/VoltarButton";
import { Users, Award, CheckCircle2, MapPinned, TriangleAlert, CalendarCheck, UserCheck } from "lucide-react";
import type { PontoApoio, PontoRisco, Rota } from "@/types/database";

interface StatsAdmin {
  peregrinos_ativos: number;
  peregrinacoes_concluidas: number;
  concluidas_hoje: number;
  checkins_hoje: number;
  checkins_total: number;
  pontos_apoio_ativos: number;
  pontos_risco_total: number;
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
        { icon: Users, label: "Peregrinos ativos agora", value: stats.peregrinos_ativos },
        { icon: Award, label: "Peregrinações concluídas", value: stats.peregrinacoes_concluidas },
        { icon: CalendarCheck, label: "Concluídas hoje", value: stats.concluidas_hoje },
        { icon: CheckCircle2, label: "Check-ins hoje", value: stats.checkins_hoje },
        { icon: MapPinned, label: "PAP ativos", value: stats.pontos_apoio_ativos },
        { icon: TriangleAlert, label: "Locais de risco", value: stats.pontos_risco_total },
        {
          icon: UserCheck,
          label: "Gerentes PAP pendentes",
          value: stats.gerentes_pendentes,
          href: "/admin/gerentes",
        },
      ]
    : [];

  let peregrinosAtivos: PeregrinoLinha[] = [];
  let peregrinosConcluidos: PeregrinoLinha[] = [];

  if (isAdmin) {
    const [{ data: ativas }, { data: concluidas }, { data: rotas }] = await Promise.all([
      supabase
        .from("peregrinacoes")
        .select("*")
        .eq("status", "em_andamento")
        .order("data_inicio", { ascending: false })
        .limit(50),
      supabase
        .from("peregrinacoes")
        .select("*")
        .eq("status", "concluida")
        .order("data_fim", { ascending: false })
        .limit(50),
      supabase.from("rotas").select("*"),
    ]);

    const todasPeregrinacoes = [...(ativas ?? []), ...(concluidas ?? [])];
    const userIds = [...new Set(todasPeregrinacoes.map((p) => p.user_id as string))];
    const peregrinacaoIds = todasPeregrinacoes.map((p) => p.id as string);

    const [{ data: perfis }, { data: checkins }, { data: localizacoesAtivas }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, nome_completo").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; nome_completo: string }[] }),
      peregrinacaoIds.length
        ? supabase.from("checkins").select("peregrinacao_id").in("peregrinacao_id", peregrinacaoIds)
        : Promise.resolve({ data: [] as { peregrinacao_id: string }[] }),
      supabase.from("localizacoes_ativas").select("peregrinacao_id, latitude, longitude, atualizado_em"),
    ]);

    const nomeDoUsuario = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
    const contagemCheckins = new Map<string, number>();
    (checkins ?? []).forEach((c) => {
      contagemCheckins.set(c.peregrinacao_id, (contagemCheckins.get(c.peregrinacao_id) ?? 0) + 1);
    });
    const localizacaoPorPeregrinacao = new Map(
      (localizacoesAtivas ?? []).map((l) => [l.peregrinacao_id, l])
    );
    const nomeDaRota = new Map(((rotas ?? []) as Rota[]).map((r) => [r.id, r.nome]));

    function paraLinha(p: {
      id: string;
      user_id: string;
      status: "em_andamento" | "concluida";
      meio_transporte: string;
      rota_id: string | null;
      data_inicio: string | null;
      data_fim: string | null;
    }): PeregrinoLinha {
      const loc = localizacaoPorPeregrinacao.get(p.id);
      return {
        id: p.id,
        nome: nomeDoUsuario.get(p.user_id) ?? "Peregrino",
        status: p.status,
        meioTransporte: p.meio_transporte,
        rotaNome: p.rota_id ? nomeDaRota.get(p.rota_id) ?? null : null,
        dataInicio: p.data_inicio,
        dataFim: p.data_fim,
        checkinsCount: contagemCheckins.get(p.id) ?? 0,
        localizacaoAtual: loc
          ? { latitude: loc.latitude, longitude: loc.longitude, atualizadoEm: loc.atualizado_em }
          : null,
      };
    }

    peregrinosAtivos = (ativas ?? []).map(paraLinha);
    peregrinosConcluidos = (concluidas ?? []).map(paraLinha);
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
        <section>
          <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
            Peregrinos — quem está ativo e quem já concluiu
          </h2>
          <PeregrinosAdminClient ativos={peregrinosAtivos} concluidos={peregrinosConcluidos} />
        </section>
      )}
    </div>
  );
}
