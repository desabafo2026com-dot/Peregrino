import { createClient } from "@/lib/supabase/server";
import { LADO_RODOVIA_LABELS, NIVEL_RISCO_LABELS } from "@/lib/constants";
import RiscoMapClient from "./RiscoMapClient";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import type { PontoRisco, TrechoSeguranca } from "@/types/database";

const DICAS_GERAIS = [
  "Caminhe sempre de frente para o tráfego quando não houver marginal ou acostamento largo.",
  "Use roupas e acessórios com cores claras ou refletivas, principalmente ao amanhecer, entardecer e à noite.",
  "Evite caminhar durante a madrugada em trechos sem iluminação.",
  "Mantenha-se hidratado e faça pausas nos pontos de apoio.",
  "Ande em fila única em trechos estreitos, nunca lado a lado.",
  "Leve um documento de identificação e o telefone de um contato de emergência sempre visível.",
  "Avise alguém de confiança sobre seu trajeto e horários previstos.",
  "Em caso de mal-estar, procure o ponto de apoio mais próximo ou acione a emergência.",
];

function riscoColor(nivel: number) {
  if (nivel >= 4) return "text-red-600";
  if (nivel === 3) return "text-amber-600";
  return "text-green-600";
}

export default async function RotasPage() {
  const supabase = await createClient();
  const [{ data: trechos }, { data: riscos }] = await Promise.all([
    supabase.from("trechos_seguranca").select("*").order("km_inicial"),
    supabase.from("pontos_risco").select("*"),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Rotas seguras</h1>
        <p className="text-sm text-neutral-500">
          Orientações sobre qual lado da rodovia seguir e onde ficam os
          pontos de maior risco. Sempre siga também as orientações da PRF no
          local.
        </p>
      </div>

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
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
          Lado da rodovia por trecho
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                <th className="pb-2 pr-4">Km</th>
                <th className="pb-2 pr-4">Lado recomendado</th>
                <th className="pb-2 pr-4">Risco</th>
                <th className="pb-2">Observação</th>
              </tr>
            </thead>
            <tbody>
              {(trechos as TrechoSeguranca[] | null)?.map((t) => (
                <tr key={t.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {t.km_inicial} – {t.km_final}
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    {LADO_RODOVIA_LABELS[t.lado_recomendado]}
                  </td>
                  <td className={`py-2 pr-4 font-medium ${riscoColor(t.nivel_risco)}`}>
                    {NIVEL_RISCO_LABELS[t.nivel_risco]}
                  </td>
                  <td className="py-2 text-neutral-600 dark:text-neutral-300">
                    {t.observacao}
                  </td>
                </tr>
              ))}
              {!trechos?.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-400">
                    Nenhum trecho cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700">
          <TriangleAlert size={20} /> Pontos de maior risco
        </h2>
        <RiscoMapClient pontosRisco={(riscos ?? []) as PontoRisco[]} />
      </section>
    </div>
  );
}
