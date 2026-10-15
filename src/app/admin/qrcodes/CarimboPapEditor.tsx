"use client";

import { useRef, useState } from "react";
import { Eraser, ImageUp, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CarimboPap from "@/components/CarimboPap";
import { removerFundoClaro } from "@/lib/fundo-transparente";

// Rodada 72 — o administrador vê como fica o carimbo virtual deste PAP no
// caderno de bordo e pode trocar por uma imagem própria (PNG com fundo
// transparente fica melhor). Data e hora de exemplo.
const DATA_EXEMPLO = "2026-10-12T09:30:00-03:00";

// Rodada 74 — além de redimensionar, deixa o fundo claro transparente.
async function redimensionarPng(arquivo: Blob, lado = 600, tirarFundo = true): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const escala = Math.min(1, lado / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (tirarFundo) removerFundoClaro(canvas);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falhou"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CarimboPapEditor({
  token,
  nome,
  cidade,
  km,
  urlInicial,
  onMudou,
}: {
  token: string;
  nome: string;
  cidade: string | null;
  km: number | null;
  urlInicial: string | null;
  onMudou: (url: string | null) => void;
}) {
  const [url, setUrl] = useState(urlInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tirarFundo, setTirarFundo] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function definir(novaUrl: string | null) {
    const { error } = await createClient().rpc("admin_definir_carimbo", { p_token: token, p_url: novaUrl ?? "" });
    if (error) throw error;
    setUrl(novaUrl);
    onMudou(novaUrl);
  }

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setSalvando(true);
    setErro(null);
    try {
      const png = await redimensionarPng(arquivo, 600, tirarFundo);
      await subir(png, `${token}-${arquivo.lastModified}${tirarFundo ? "-t" : ""}.png`);
    } catch {
      setErro("Não foi possível enviar a imagem. A Migration 60 já foi rodada?");
    } finally {
      setSalvando(false);
    }
  }

  async function subir(png: Blob, caminho: string) {
    {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("carimbos")
        .upload(caminho, png, { upsert: true, contentType: "image/png", cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from("carimbos").getPublicUrl(caminho);
      await definir(data.publicUrl);
    }
  }

  // Rodada 74 — para imagens já enviadas com fundo branco: baixa, tira o
  // fundo e salva de novo.
  async function deixarTransparente(e: React.MouseEvent<HTMLButtonElement>) {
    if (!url) return;
    setSalvando(true);
    setErro(null);
    try {
      const original = await (await fetch(url)).blob();
      const png = await redimensionarPng(original, 600, true);
      await subir(png, `${token}-t${Math.round(e.timeStamp)}.png`);
    } catch {
      setErro("Não foi possível tirar o fundo desta imagem agora.");
    } finally {
      setSalvando(false);
    }
  }

  async function voltarPadrao() {
    setSalvando(true);
    setErro(null);
    try {
      await definir(null);
    } catch {
      setErro("Não foi possível voltar ao padrão agora.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t border-neutral-100 bg-amber-50/40 px-3 py-4 dark:border-neutral-800 dark:bg-amber-950/10">
      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
        Assim fica o carimbo no caderno de bordo{url ? " (imagem própria)" : " (padrão do app)"}:
      </p>
      <div className="w-36">
        <CarimboPap carimbo={{ id: token, pap_nome: nome, cidade, km, carimbado_em: DATA_EXEMPLO, imagem_url: url }} />
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={enviar} />
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={salvando} onClick={() => inputRef.current?.click()} className="btn-secondary flex items-center gap-1 text-sm">
          <ImageUp size={16} /> {salvando ? "Enviando..." : "Carregar outra imagem"}
        </button>
        {url && (
          <button type="button" disabled={salvando} onClick={deixarTransparente} className="btn-secondary flex items-center gap-1 text-sm">
            <Eraser size={16} /> Deixar fundo transparente
          </button>
        )}
        {url && (
          <button type="button" disabled={salvando} onClick={voltarPadrao} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50">
            <RotateCcw size={16} /> Voltar ao carimbo padrão
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        <input type="checkbox" checked={tirarFundo} onChange={(ev) => setTirarFundo(ev.target.checked)} />
        Ao carregar, deixar o fundo branco transparente
      </label>
      <p className="text-[11px] text-neutral-500" style={{ textAlign: "center" }}>
        Dica: use uma imagem quadrada. O fundo branco em volta do carimbo é retirado sozinho (o branco de dentro do
        carimbo fica). A data e a hora da passagem aparecem
        embaixo da imagem.
      </p>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
