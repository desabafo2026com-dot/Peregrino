import { createClient } from "@/lib/supabase/server";
import AdminMapClient from "./AdminMapClient";
import { Users, Award, CheckCircle2, MapPinned, TriangleAlert, CalendarCheck } from "lucide-react";
import type { PontoApoio, PontoRisco } from "@/types/database";

interface StatsAdmin {
  peregrinos_ativos: number;
  peregrinacoes_concluidas: number;
  concluidas_hoje: number;
  checkins_hoje: number;
  checkins_total: number;
  pontos_apoio_ativos: number;
  pontos_risco_total: number;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

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
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card text-center">
            <c.icon className="mx-auto mb-1 text-amber-700" size={20} />
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">{c.value}</p>
            <p className="text-xs text-neutral-500">{c.label}</p>
          </div>
        ))}
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
    </div>
  );
}
