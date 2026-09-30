import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NIVEL_RISCO_LABELS, SENTIDO_KM_ABREV, SENTIDO_PISTA_LABELS, nomeRota, kmPertenceARota } from "@/lib/constants";
import RiscoMapClient from "./RiscoMapClient";
import QuadroResumoRiscos from "@/components/QuadroResumoRiscos";
import FotoAmpliavel from "@/components/FotoAmpliavel";
import DicasSegurancaCards from "@/components/DicasSegurancaCards";
import VoltarButton from "@/components/VoltarButton";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import type { PontoRisco, Rota, PontoCheckin } from "@/types/database";

// Cores claras (pastel), consistentes com o mapa geral (/mapa).
const COR_ROTA: Record<string, string> = {
  norte: "#7dd3fc",
  sul: "#fdba74",
};


// Só existem 3 níveis (Moderado/Alto/Muito alto) — ver NIVEL_RISCO_LABELS.
function riscoColor(nivel: number) {
  return nivel >= 4 ? "text-red-600" : "text-amber-600";
}

function kmSentidoLabel(km: number | null, sentido: string | null) {
  if (km == null) return "—";
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

export default async function RotasPage({
  searchParams,
}: {
  searchParams: Promise<{ rota?: string; sentido?: string }>;
}) {
  const { rota: rotaSlug, sentido: sentidoParamRaw } = await searchParams;
  // Filtro adicional por lado da rodovia (Rodada 33, a pedido do usuário),
  // no mesmo padrão de link/query-param já usado no filtro de rota acima —
  // "sp"/"rj" são os códigos internos de sentido (ver SENTIDO_PISTA_LABELS).
  const sentidoParam = sentidoParamRaw === "sp" || sentidoParamRaw === "rj" ? sentidoParamRaw : undefined;
  const supabase = await createClient();
  const { data: rotasData } = await supabase.from("rotas").select("*").order("ordem");
  const rotas = (rotasData ?? []) as Rota[];
  const rotaAtual = rotas.find((r) => r.slug === rotaSlug) ?? rotas[0];

  // Busca todos os pontos de risco (não só os da rota_id atual) para poder
  // decidir a associação com a rota pelo km real (ver kmPertenceARota) —
  // não só pela rota_id escolhida no cadastro, que pode estar errada ou em
  // branco ("ambas as rotas").
  const { data: todosRiscos } = await supabase.from("pontos_risco").select("*");
  const riscos = rotaAtual
    ? ((todosRiscos ?? []) as PontoRisco[])
        .filter((r) =>
          r.km_referencia != null
            ? kmPertenceARota(r.km_referencia, rotaAtual.slug)
            : r.rota_id === null || r.rota_id === rotaAtual.id
        )
        .filter((r) => !sentidoParam || r.sentido === sentidoParam)
    : [];

  const { data: pontosCheckin } = await supabase.from("pontos_checkin").select("*").order("ordem");
  const rotasLinhas = rotas.map((r) => ({
    nome: nomeRota(r),
    cor: COR_ROTA[r.slug] ?? r.cor,
    pontos: ((pontosCheckin ?? []) as PontoCheckin[])
      .filter((p) => p.rota_id === r.id)
      .map((p) => ({ lat: p.latitude, lng: p.longitude, ordem: p.ordem })),
  }));

  // Ordem de leitura ao longo do trajeto: no Sentido Norte (São Paulo →
  // Aparecida) o km da rodovia diminui conforme se avança; no Sentido Sul
  // (Queluz/Rio → Aparecida) o km aumenta. Sem km cadastrado, fica por
  // último.
  const riscosOrdenados = [...((riscos ?? []) as PontoRisco[])].sort((a, b) => {
    if (a.km_referencia == null) return 1;
    if (b.km_referencia == null) return -1;
    return rotaAtual?.slug === "sul"
      ? a.km_referencia - b.km_referencia
      : b.km_referencia - a.km_referencia;
  });

  return (
    <div className="flex flex-col gap-8">
      <VoltarButton href="/" />
      <div>
        <h1 className="text-2xl font-bold">Rotas de peregrinação</h1>
        <p className="text-sm text-neutral-500">
          Duas rotas até a Basílica de Aparecida: São Paulo - Aparecida (a
          mais procurada) e Rio de Janeiro - Aparecida (saindo de Queluz-SP).
          Cada uma tem pista nos dois sentidos (Norte e Sul). Veja dicas de
          segurança e onde ficam os pontos de maior risco em cada rota.
          Sempre siga também as orientações da PRF no local.
        </p>
      </div>

      {rotas.length > 0 && (
        <div className="flex gap-2">
          {rotas.map((r) => (
            <Link
              key={r.id}
              href={`/rotas?rota=${r.slug}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                rotaAtual?.id === r.id
                  ? "bg-amber-800 text-white"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              {nomeRota(r)}
            </Link>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
          <ShieldAlert size={20} /> Dicas de segurança
        </h2>
        {/* Rodada 55 — dicas em cards (ver DicasSegurancaCards). */}
        <DicasSegurancaCards />
      </section>

      {/* Rodada 46 — quadro resumo pedido pelo usuário, logo abaixo das dicas. */}
      <QuadroResumoRiscos />

      {/* Rodada 44 — a pedido do usuário, o mapa sobe para logo abaixo das
          dicas de segurança (antes ficava no fim da página, depois da
          tabela) e o título diz como ver os detalhes de cada ponto. */}
      <section>
        <h2 className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-bold text-red-700">
          <TriangleAlert size={20} /> Mapa dos pontos de risco
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            — clique na bandeira para visualizar os detalhes
          </span>
        </h2>
        <RiscoMapClient pontosRisco={riscosOrdenados} rotasLinhas={rotasLinhas} />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700">
          <TriangleAlert size={20} /> Pontos de risco ao longo da Rota — {nomeRota(rotaAtual)}
          {sentidoParam ? ` — ${SENTIDO_PISTA_LABELS[sentidoParam]}` : ""}
        </h2>
        <div className="mb-3 flex gap-2">
          <Link
            href={`/rotas?rota=${rotaAtual?.slug ?? ""}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              !sentidoParam
                ? "bg-red-700 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            Ambos os sentidos
          </Link>
          <Link
            href={`/rotas?rota=${rotaAtual?.slug ?? ""}&sentido=sp`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              sentidoParam === "sp"
                ? "bg-red-700 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            Pista Norte
          </Link>
          <Link
            href={`/rotas?rota=${rotaAtual?.slug ?? ""}&sentido=rj`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              sentidoParam === "rj"
                ? "bg-red-700 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            Pista Sul
          </Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                <th className="pb-2 pr-4">Km / sentido</th>
                <th className="pb-2 pr-4">Foto</th>
                <th className="pb-2 pr-4">Local</th>
                <th className="pb-2 pr-4">Risco</th>
                <th className="pb-2">Observações</th>
              </tr>
            </thead>
            <tbody>
              {riscosOrdenados.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {kmSentidoLabel(r.km_referencia, r.sentido)}
                  </td>
                  {/* Rodada 58 — foto do local numa coluna própria, logo depois do km (toque para ampliar). */}
                  <td className="py-2 pr-4">
                    {r.foto_url ? (
                      <FotoAmpliavel
                        src={r.foto_url}
                        alt={`Foto do local: ${r.titulo}`}
                        className="block h-14 w-20 overflow-hidden rounded-lg"
                      />
                    ) : (
                      <span className="text-neutral-300 dark:text-neutral-700">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-medium">{r.titulo}</td>
                  <td className={`py-2 pr-4 font-medium ${riscoColor(r.nivel_risco)}`}>
                    {NIVEL_RISCO_LABELS[r.nivel_risco]}
                  </td>
                  <td className="py-2 text-neutral-600 dark:text-neutral-300">
                    {r.descricao ?? "—"}
                  </td>
                </tr>
              ))}
              {riscosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-neutral-400">
                    Nenhum ponto de risco cadastrado ainda nesta rota.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Lista baseada em relatos e cadastros da administração — pode não
          cobrir todos os riscos reais da via. Sempre observe as condições do
          local e siga as orientações da PRF.
        </p>
      </section>

    </div>
  );
}
