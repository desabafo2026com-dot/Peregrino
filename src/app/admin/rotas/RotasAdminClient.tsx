"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LADO_RODOVIA_LABELS, NIVEL_RISCO_LABELS } from "@/lib/constants";
import { Trash2, Plus } from "lucide-react";
import type { Rota, TrechoSeguranca } from "@/types/database";

const LADO_OPTIONS = Object.keys(LADO_RODOVIA_LABELS);

interface Props {
  rotasIniciais: Rota[];
  trechosIniciais: TrechoSeguranca[];
}

export default function RotasAdminClient({ rotasIniciais, trechosIniciais }: Props) {
  const supabase = createClient();
  const [rotas] = useState(rotasIniciais);
  const [trechos, setTrechos] = useState(trechosIniciais);
  const [rotaAtiva, setRotaAtiva] = useState(rotasIniciais[0]?.id ?? "");

  const [kmInicial, setKmInicial] = useState("");
  const [kmFinal, setKmFinal] = useState("");
  const [ladoRecomendado, setLadoRecomendado] = useState(LADO_OPTIONS[0]);
  const [nivelRisco, setNivelRisco] = useState("2");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trechosDaRota = trechos
    .filter((t) => t.rota_id === rotaAtiva)
    .sort((a, b) => a.km_inicial - b.km_inicial);

  async function adicionarTrecho(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!rotaAtiva) {
      setErro("Selecione uma rota.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("trechos_seguranca")
      .insert({
        rota_id: rotaAtiva,
        km_inicial: Number(kmInicial),
        km_final: Number(kmFinal),
        lado_recomendado: ladoRecomendado,
        nivel_risco: Number(nivelRisco),
        observacao: observacao || null,
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setTrechos((prev) => [...prev, data as TrechoSeguranca]);
    setKmInicial("");
    setKmFinal("");
    setObservacao("");
  }

  async function excluirTrecho(id: string) {
    if (!confirm("Excluir este trecho?")) return;
    const { error } = await supabase.from("trechos_seguranca").delete().eq("id", id);
    if (error) {
      setErro(error.message);
      return;
    }
    setTrechos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {rotas.map((r) => (
          <button
            key={r.id}
            onClick={() => setRotaAtiva(r.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              rotaAtiva === r.id
                ? "bg-amber-800 text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            {r.nome} ({r.origem} → {r.destino})
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
              <th className="pb-2 pr-4">Km</th>
              <th className="pb-2 pr-4">Lado recomendado</th>
              <th className="pb-2 pr-4">Risco</th>
              <th className="pb-2 pr-4">Observação</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {trechosDaRota.map((t) => (
              <tr key={t.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                <td className="py-2 pr-4 whitespace-nowrap">{t.km_inicial} – {t.km_final}</td>
                <td className="py-2 pr-4 font-medium">{LADO_RODOVIA_LABELS[t.lado_recomendado]}</td>
                <td className="py-2 pr-4">{NIVEL_RISCO_LABELS[t.nivel_risco]}</td>
                <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">{t.observacao}</td>
                <td className="py-2 text-right">
                  <button onClick={() => excluirTrecho(t.id)} className="text-neutral-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!trechosDaRota.length && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-neutral-400">
                  Nenhum trecho cadastrado nesta rota ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={adicionarTrecho} className="card flex flex-col gap-4">
        <h3 className="text-base font-bold text-amber-800 dark:text-amber-500">Adicionar trecho</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Km inicial</label>
            <input
              required
              type="number"
              step="0.1"
              className="input"
              value={kmInicial}
              onChange={(e) => setKmInicial(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Km final</label>
            <input
              required
              type="number"
              step="0.1"
              className="input"
              value={kmFinal}
              onChange={(e) => setKmFinal(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Lado recomendado</label>
            <select className="input" value={ladoRecomendado} onChange={(e) => setLadoRecomendado(e.target.value)}>
              {LADO_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {LADO_RODOVIA_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nível de risco</label>
            <select className="input" value={nivelRisco} onChange={(e) => setNivelRisco(e.target.value)}>
              {Object.entries(NIVEL_RISCO_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {v} — {label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observação</label>
            <input className="input" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={loading} className="btn-primary flex w-fit items-center gap-2">
          <Plus size={18} /> {loading ? "Salvando..." : "Adicionar trecho"}
        </button>
      </form>
    </div>
  );
}
