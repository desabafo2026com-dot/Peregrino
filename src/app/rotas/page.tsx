import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NIVEL_RISCO_LABELS, SENTIDO_KM_ABREV, nomeRota, kmPertenceARota } from "@/lib/constants";
import RiscoMapClient from "./RiscoMapClient";
import VoltarButton from "@/components/VoltarButton";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import type { PontoRisco, Rota, PontoCheckin } from "@/types/database";

// Cores claras (pastel), consistentes com o mapa geral (/mapa).
const COR_ROTA: Record<string, string> = {
  norte: "#7dd3fc",
  sul: "#fdba74",
};

const DICAS_GERAIS = [
  "Caminhe sempre de frente para o tráfego quando não houver marginal ou acostamento largo.",
  "Use roupas e acessórios com cores claras ou refletivas, principalmente ao amanhecer, entardecer e à noite.",
  "Evite caminhar durante a madrugada em trechos sem iluminação.",
  "Mantenha-se hidratado e faça pausas nos pontos de apoio (PAP).",
  "Ande em fila única em trechos estreitos, nunca lado a lado.",
  "Leve um documento de identificação e o telefone de um contato de emergência sempre visível.",
  "Avise alguém de confiança sobre seu trajeto e horários previstos.",
  "Em caso de mal-estar, procure o PAP mais próximo ou acione a emergência.",
];

function riscoColor(nivel: number) {
  if (nivel >= 4) return "text-red-600";
  if (nivel === 3) return "text-amber-600";
  return "text-green-600";
}

function kmSentidoLabel(km: number | null, sentido: string | null) {
  if (km == null) return "—";
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

export default async function RotasPage({
  searchParams,
}: {
  searchParams: Promise<{ rota?: string }>;
}) {
  const { rota: rotaSlug } = await searchParams;
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
    ? ((todosRiscos ?? []) as PontoRisco[]).filter((r) =>
        r.km_referencia != null
          ? kmPertenceARota(r.km_referencia, rotaAtual.slug)
          : r.rota_id === null || r.rota_id === rotaAtual.id
      )
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
        <div className="card">
          <ul className="flex flex-col gap-2 text-sm">
            {DICAS_GERAIS.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-700">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700">
          <TriangleAlert size={20} /> Pontos de risco ao longo da Rota — {nomeRota(rotaAtual)}
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                <th className="pb-2 pr-4">Km / sentido</th>
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
                  <td colSpan={4} className="py-4 text-center text-neutral-400">
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

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700">
          <TriangleAlert size={20} /> Mapa dos pontos de risco
        </h2>
        <RiscoMapClient pontosRisco={riscosOrdenados} rotasLinhas={rotasLinhas} />
      </section>
    </div>
  );
}
