"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImageUp, Loader2, RotateCcw, Stamp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CarimboPap from "@/components/CarimboPap";
import {
  CORES_TINTA,
  canvasParaBlob,
  carregarImagem,
  efeitoCarimbo,
  imagemParaCanvas,
  type ModoCarimbo,
} from "@/lib/efeito-carimbo";

// Rodada 77 — editor do carimbo virtual do PAP, usado pela administração
// e pelo gerente do PAP: tira foto do carimbo de verdade (ou escolhe uma
// imagem), o app transforma em carimbo (fundo e branco de dentro somem,
// tinta numa cor só), mostra como fica no caderno e salva.
const DATA_EXEMPLO = "2026-10-12T09:30:00-03:00";

export default function EditorCarimboImagem({
  nome,
  cidade,
  km,
  urlAtual,
  pastaUpload,
  prefixoArquivo,
  salvarUrl,
}: {
  nome: string;
  cidade: string | null;
  km: number | null;
  urlAtual: string | null;
  // pasta no bucket "carimbos" (ex.: "admin" ou "gerente/<id do usuário>")
  pastaUpload: string;
  prefixoArquivo: string;
  salvarUrl: (url: string | null) => Promise<void>;
}) {
  const [url, setUrl] = useState(urlAtual);
  const [origem, setOrigem] = useState<HTMLCanvasElement | null>(null);
  const [modo, setModo] = useState<ModoCarimbo>("tinta");
  const [corId, setCorId] = useState("original");
  const [previa, setPrevia] = useState<{ url: string; blob: Blob } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // recalcula a prévia quando muda a imagem, o modo ou a cor
  useEffect(() => {
    if (!origem) return;
    let vivo = true;
    const cor = CORES_TINTA.find((c) => c.id === corId)?.hex ?? null;
    const canvas = efeitoCarimbo(origem, { modo, corHex: modo === "tinta" ? cor : null });
    canvasParaBlob(canvas).then((blob) => {
      if (!vivo) return;
      setPrevia((antiga) => {
        if (antiga) URL.revokeObjectURL(antiga.url);
        return { url: URL.createObjectURL(blob), blob };
      });
    });
    return () => {
      vivo = false;
    };
  }, [origem, modo, corId]);

  async function abrirArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    try {
      const objeto = URL.createObjectURL(arquivo);
      const img = await carregarImagem(objeto);
      URL.revokeObjectURL(objeto);
      setOrigem(imagemParaCanvas(img));
    } catch {
      setErro("Não consegui abrir essa imagem. Tente outra (JPG ou PNG).");
    }
  }

  async function transformarAtual() {
    if (!url) return;
    setErro(null);
    setOcupado(true);
    try {
      const blob = await (await fetch(url)).blob();
      const objeto = URL.createObjectURL(blob);
      const img = await carregarImagem(objeto);
      URL.revokeObjectURL(objeto);
      setOrigem(imagemParaCanvas(img));
    } catch {
      setErro("Não consegui abrir a imagem atual.");
    } finally {
      setOcupado(false);
    }
  }

  function cancelar() {
    if (previa) URL.revokeObjectURL(previa.url);
    setPrevia(null);
    setOrigem(null);
  }

  async function salvar() {
    if (!previa) return;
    setOcupado(true);
    setErro(null);
    try {
      const supabase = createClient();
      const caminho = `${pastaUpload}/${prefixoArquivo}-${previa.blob.size}-${Math.round(performance.now())}.png`;
      const { error } = await supabase.storage
        .from("carimbos")
        .upload(caminho, previa.blob, { contentType: "image/png", cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from("carimbos").getPublicUrl(caminho);
      await salvarUrl(data.publicUrl);
      setUrl(data.publicUrl);
      cancelar();
    } catch {
      setErro("Não foi possível salvar agora. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function voltarPadrao() {
    setOcupado(true);
    setErro(null);
    try {
      await salvarUrl(null);
      setUrl(null);
    } catch {
      setErro("Não foi possível voltar ao padrão agora.");
    } finally {
      setOcupado(false);
    }
  }

  const exemplo = { id: prefixoArquivo, pap_nome: nome, cidade, km, carimbado_em: DATA_EXEMPLO };

  return (
    <div className="flex flex-col items-center gap-3">
      {!origem ? (
        <>
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
            Assim fica o carimbo no caderno de bordo{url ? " (imagem própria)" : " (padrão do app)"}:
          </p>
          <div className="w-36">
            <CarimboPap carimbo={{ ...exemplo, imagem_url: url }} />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" disabled={ocupado} onClick={() => fotoRef.current?.click()} className="btn-primary flex items-center gap-1 text-sm">
              <Camera size={16} /> Tirar foto do carimbo
            </button>
            <button type="button" disabled={ocupado} onClick={() => arquivoRef.current?.click()} className="btn-secondary flex items-center gap-1 text-sm">
              <ImageUp size={16} /> Escolher imagem
            </button>
            {url && (
              <button type="button" disabled={ocupado} onClick={transformarAtual} className="btn-secondary flex items-center gap-1 text-sm">
                {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Stamp size={16} />} Transformar a atual em carimbo
              </button>
            )}
            {url && (
              <button
                type="button"
                disabled={ocupado}
                onClick={voltarPadrao}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <RotateCcw size={16} /> Voltar ao padrão
              </button>
            )}
          </div>
          <p className="text-[11px] text-neutral-500" style={{ textAlign: "center" }}>
            Dica: carimbe numa folha branca, com boa luz, e fotografe de cima, com o carimbo inteiro na foto. Também
            serve um logo ou desenho. O app tira o fundo e deixa com cara de carimbo.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Prévia no caderno de bordo:</p>
          <div className="w-40 rounded-xl p-2" style={{ background: "linear-gradient(180deg, #fbf5e6 0%, #f3e7cc 100%)" }}>
            {previa ? (
              <CarimboPap carimbo={{ ...exemplo, imagem_url: previa.url }} />
            ) : (
              <div className="flex aspect-square items-center justify-center">
                <Loader2 className="animate-spin text-amber-700" />
              </div>
            )}
          </div>
          <div className="flex gap-2 text-sm">
            {(
              [
                ["tinta", "Carimbo (uma cor)"],
                ["cores", "Manter as cores"],
              ] as const
            ).map(([v, r]) => (
              <button
                key={v}
                type="button"
                onClick={() => setModo(v)}
                className={`rounded-lg px-3 py-1.5 font-semibold ${
                  modo === v ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {modo === "tinta" && (
            <div className="flex flex-wrap justify-center gap-2">
              {CORES_TINTA.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCorId(c.id)}
                  title={c.nome}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                    corId === c.id ? "border-amber-800 font-bold" : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-neutral-300"
                    style={{ background: c.hex ?? "conic-gradient(#1d4ed8, #b91c1c, #15803d, #1d4ed8)" }}
                  />
                  {c.nome}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" disabled={ocupado || !previa} onClick={salvar} className="btn-primary flex items-center gap-1 text-sm">
              {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar como carimbo
            </button>
            <button type="button" disabled={ocupado} onClick={cancelar} className="btn-secondary flex items-center gap-1 text-sm">
              <X size={16} /> Cancelar
            </button>
          </div>
        </>
      )}
      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          abrirArquivo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={arquivoRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          abrirArquivo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
