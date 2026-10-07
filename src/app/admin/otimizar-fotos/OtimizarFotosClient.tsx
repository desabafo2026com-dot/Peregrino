"use client";

import { useState } from "react";
import { ImageDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { comprimirDeUrl, CACHE_UM_ANO } from "@/lib/comprimir-imagem";

export interface FotoParaOtimizar {
  tabela: "pontos_apoio" | "pontos_risco" | "pontos_comerciais";
  bucket: string;
  id: string;
  nome: string;
  url: string;
}

interface Linha extends FotoParaOtimizar {
  bytes: number | null;
  status: "aguardando" | "ok" | "pequena" | "otimizada" | "erro";
  novosBytes?: number;
  erro?: string;
}

// Acima disto vale a pena reduzir.
const LIMITE_BYTES = 350 * 1024;

function kb(b: number | null | undefined) {
  if (b == null) return "?";
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

export default function OtimizarFotosClient({ userId, fotos }: { userId: string; fotos: FotoParaOtimizar[] }) {
  const [linhas, setLinhas] = useState<Linha[]>(() => fotos.map((f) => ({ ...f, bytes: null, status: "aguardando" })));
  const [fase, setFase] = useState<"inicio" | "analisando" | "analisado" | "otimizando" | "fim">("inicio");

  function atualizar(i: number, dados: Partial<Linha>) {
    setLinhas((atual) => atual.map((l, j) => (j === i ? { ...l, ...dados } : l)));
  }

  async function analisar() {
    setFase("analisando");
    for (let i = 0; i < linhas.length; i++) {
      try {
        // HEAD só lê o tamanho, sem baixar a foto.
        const r = await fetch(linhas[i].url, { method: "HEAD", cache: "no-store" });
        const tamanho = Number(r.headers.get("content-length") ?? "0") || null;
        atualizar(i, { bytes: tamanho, status: tamanho != null && tamanho <= LIMITE_BYTES ? "pequena" : "ok" });
      } catch {
        atualizar(i, { status: "erro", erro: "não foi possível ler" });
      }
    }
    setFase("analisado");
  }

  async function otimizar() {
    setFase("otimizando");
    const supabase = createClient();
    const lista = linhas;
    for (let i = 0; i < lista.length; i++) {
      const l = lista[i];
      if (l.status !== "ok") continue;
      try {
        const { original, reduzida } = await comprimirDeUrl(l.url, { maxLado: 1280, qualidade: 0.8 });
        if (reduzida.size >= original.size * 0.85) {
          atualizar(i, { status: "pequena" });
          continue;
        }
        const caminho = `${userId}/otimizada-${l.id}-${Date.now()}.jpg`;
        const { error: erroUpload } = await supabase.storage
          .from(l.bucket)
          .upload(caminho, reduzida, { cacheControl: CACHE_UM_ANO, contentType: "image/jpeg" });
        if (erroUpload) throw erroUpload;
        const { data } = supabase.storage.from(l.bucket).getPublicUrl(caminho);
        const { error: erroUpdate } = await supabase.from(l.tabela).update({ foto_url: data.publicUrl }).eq("id", l.id);
        if (erroUpdate) throw erroUpdate;
        atualizar(i, { status: "otimizada", novosBytes: reduzida.size, url: data.publicUrl });
      } catch (e) {
        atualizar(i, { status: "erro", erro: e instanceof Error ? e.message : "falhou" });
      }
    }
    setFase("fim");
  }

  const grandes = linhas.filter((l) => l.status === "ok");
  const totalGrandes = grandes.reduce((s, l) => s + (l.bytes ?? 0), 0);
  const otimizadas = linhas.filter((l) => l.status === "otimizada");
  const economia = otimizadas.reduce((s, l) => s + ((l.bytes ?? 0) - (l.novosBytes ?? 0)), 0);

  if (fotos.length === 0) return <p className="text-sm text-neutral-500">Nenhuma foto cadastrada.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <p className="text-sm" style={{ textAlign: "left" }}>
          {fase === "inicio" && `${fotos.length} fotos cadastradas. Primeiro, veja quais estão grandes.`}
          {fase === "analisando" && "Lendo o tamanho de cada foto..."}
          {fase === "analisado" &&
            (grandes.length > 0
              ? `${grandes.length} fotos grandes (${kb(totalGrandes)} no total) podem ser reduzidas.`
              : "Todas as fotos já estão leves. Nada a fazer.")}
          {fase === "otimizando" && "Reduzindo as fotos... não feche esta página."}
          {fase === "fim" && `Pronto! ${otimizadas.length} fotos reduzidas, economia de ${kb(economia)} a cada vez que todas forem vistas.`}
        </p>
        {fase === "inicio" && (
          <button onClick={analisar} className="btn-primary flex items-center justify-center gap-2">
            <Search size={16} /> Analisar fotos
          </button>
        )}
        {fase === "analisado" && grandes.length > 0 && (
          <button onClick={otimizar} className="btn-primary flex items-center justify-center gap-2">
            <ImageDown size={16} /> Reduzir {grandes.length} fotos agora
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1 text-xs">
        {linhas.map((l) => (
          <li key={`${l.tabela}-${l.id}`} className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 dark:border-neutral-800">
            <span className="min-w-0 truncate">{l.nome}</span>
            <span
              className={`shrink-0 font-semibold ${
                l.status === "otimizada"
                  ? "text-green-700"
                  : l.status === "erro"
                    ? "text-red-600"
                    : l.status === "ok"
                      ? "text-amber-700"
                      : "text-neutral-400"
              }`}
            >
              {l.status === "aguardando" && "—"}
              {l.status === "ok" && kb(l.bytes)}
              {l.status === "pequena" && `${kb(l.bytes)} (ok)`}
              {l.status === "otimizada" && `${kb(l.bytes)} → ${kb(l.novosBytes)}`}
              {l.status === "erro" && `erro: ${l.erro}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
