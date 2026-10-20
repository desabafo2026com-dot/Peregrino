"use client";

import { useState } from "react";
import { Map as MapIcon, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Rodada 76 — carga (uma vez) dos contornos dos municípios de SP, MG e RJ
// no banco, para o check-in automático por cidade (Migration 64). Os
// arquivos ficam em /public/dados e vão em lotes para a função
// admin_carregar_municipios. Pode rodar de novo: atualiza o que já existe.
type Linha = [number, string, string, number | null, string, unknown];

const ARQUIVOS = ["sp", "rj", "mg"];
const LOTE = 40;

export default function AdminContornosMunicipios({ carregados }: { carregados: number | null }) {
  const [total, setTotal] = useState(carregados);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);

  async function carregar() {
    setRodando(true);
    setErro(null);
    const supabase = createClient();
    let feitos = 0;
    try {
      for (const uf of ARQUIVOS) {
        setProgresso(`Baixando ${uf.toUpperCase()}...`);
        const linhas = (await (await fetch(`/dados/contornos-${uf}.json`)).json()) as Linha[];
        for (let i = 0; i < linhas.length; i += LOTE) {
          const itens = linhas.slice(i, i + LOTE).map(([ibge, nome, ufLinha, populacao, tipo, coordenadas]) => ({
            ibge,
            nome,
            uf: ufLinha,
            populacao,
            geometria: { type: tipo, coordinates: coordenadas },
          }));
          const { error } = await supabase.rpc("admin_carregar_municipios", { p_itens: itens });
          if (error) throw error;
          feitos += itens.length;
          setProgresso(`${uf.toUpperCase()}: ${Math.min(i + LOTE, linhas.length)} de ${linhas.length} · total ${feitos}`);
        }
      }
      setTotal(feitos);
      setProgresso(null);
    } catch {
      setErro("Não foi possível carregar agora. A Migration 64 já foi rodada? Tente de novo (o que já entrou só é atualizado).");
    } finally {
      setRodando(false);
    }
  }

  return (
    <section className="card">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
        <MapIcon size={18} /> Check-in automático por cidade
      </h2>
      <p className="mb-3 text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Contornos dos 1.590 municípios de SP, MG e RJ (IBGE). Com eles carregados, cada cidade por onde o peregrino
        passa entra sozinha no caderno de bordo. Precisa carregar só uma vez (leva cerca de 1 minuto).
      </p>
      {total === null ? (
        <p className="text-sm text-red-600">Rode a Migration 64 no Supabase antes de carregar.</p>
      ) : total >= 1590 ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
          <CheckCircle2 size={16} /> {total.toLocaleString("pt-BR")} municípios carregados — check-in por cidade ativo.
        </p>
      ) : (
        <p className="text-sm text-amber-700">
          {total > 0 ? `${total} de 1.590 municípios carregados.` : "Ainda não carregado — o check-in usa só as cidades das rotas."}
        </p>
      )}
      {total !== null && (
        <button type="button" onClick={carregar} disabled={rodando} className="btn-secondary mt-3 flex items-center gap-2 text-sm">
          {rodando ? <Loader2 size={16} className="animate-spin" /> : <MapIcon size={16} />}
          {rodando ? "Carregando..." : total >= 1590 ? "Carregar de novo (atualizar)" : "Carregar contornos dos municípios"}
        </button>
      )}
      {progresso && <p className="mt-2 text-xs text-neutral-500">{progresso}</p>}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
