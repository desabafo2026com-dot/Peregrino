"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Download, Share2, Footprints, CalendarDays, MapPin, CheckCircle2 } from "lucide-react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import type { Certificado } from "@/types/database";

// Formato retrato (4:5), bom tanto para feed quanto para story — todo o
// conteúdo abaixo vem sempre do certificado já emitido (dados reais da
// peregrinação), nunca é digitado ou fixo.
const ARTE_LARGURA = 1080;
const ARTE_ALTURA = 1350;

function formatarData(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function extrairOrigem(rotaNome: string | null) {
  if (!rotaNome) return null;
  const m = rotaNome.match(/\(([^→]+)→/);
  return m ? m[1].trim() : null;
}

export default function RomariaPlusView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gerando, setGerando] = useState<"baixar" | "compartilhar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const origem = extrairOrigem(c.rota_nome);
  const ano = new Date(c.data_fim ?? c.emitido_em).getFullYear();
  const dataInicio = formatarData(c.data_inicio);
  const dataFim = formatarData(c.data_fim);
  const meioLabel =
    c.meio_transporte === "outros"
      ? c.meio_transporte_outro_desc || "outro meio de transporte"
      : c.meio_transporte
        ? MEIO_TRANSPORTE_LABELS[c.meio_transporte]
        : "a pé";

  async function gerarPng(): Promise<string | null> {
    if (!ref.current) return null;
    const { toPng } = await import("html-to-image");
    return toPng(ref.current, { pixelRatio: 2 });
  }

  async function baixar() {
    setErro(null);
    setGerando("baixar");
    try {
      const dataUrl = await gerarPng();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `romaria-plus-${c.codigo}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setErro("Não foi possível gerar a arte agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  async function compartilhar() {
    setErro(null);
    setGerando("compartilhar");
    try {
      const dataUrl = await gerarPng();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `romaria-plus-${c.codigo}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Romaria Plus",
          text: "Minha peregrinação até Aparecida-SP!",
        });
      } else {
        const link = document.createElement("a");
        link.download = file.name;
        link.href = dataUrl;
        link.click();
      }
    } catch {
      // Cancelado pelo usuário ou sem suporte — sem problema.
    } finally {
      setGerando(null);
    }
  }

  return (
    <div>
      <div
        ref={ref}
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-amber-800 via-amber-900 to-neutral-900 text-white shadow-lg"
        style={{ aspectRatio: `${ARTE_LARGURA} / ${ARTE_ALTURA}`, containerType: "inline-size" }}
      >
        {/* Faixa amarela no topo, como a sinalização de pista usada no resto do app */}
        <div className="absolute inset-x-0 top-0 h-[2.5%] bg-stripe-400" />

        <div className="absolute inset-0 flex flex-col items-center justify-between px-[7%] pt-[9%] pb-[6%] text-center">
          <div className="flex flex-col items-center gap-[3%]">
            <Image
              src="/icons/logo-emblema.png"
              alt=""
              width={96}
              height={96}
              style={{ width: "16%", height: "auto" }}
              className="rounded-xl ring-2 ring-white/30"
            />
            <p
              className="font-semibold tracking-[0.2em] text-amber-200"
              style={{ fontSize: "3.2cqw" }}
            >
              ROMARIA PLUS
            </p>
          </div>

          <div className="flex flex-col items-center gap-[2%]">
            <p style={{ fontSize: "3.4cqw" }} className="text-amber-100">
              Peregrinação concluída em {ano}
            </p>
            <p
              className="font-serif font-bold"
              style={{ fontSize: "6.4cqw", lineHeight: 1.15 }}
            >
              {c.nome_peregrino}
            </p>
            <p className="flex items-center gap-1 text-amber-100" style={{ fontSize: "3.4cqw" }}>
              <MapPin size={16} className="shrink-0" />
              {origem ? `${origem} → ` : ""}Aparecida-SP
            </p>
          </div>

          <div className="flex w-full flex-col gap-[3%] rounded-xl bg-white/10 p-[5%] backdrop-blur-sm">
            <p className="flex items-center justify-center gap-2" style={{ fontSize: "3cqw" }}>
              <CalendarDays size={16} className="shrink-0" />
              {dataInicio}
              {dataFim && dataFim !== dataInicio ? ` a ${dataFim}` : ""}
              {c.duracao_texto ? ` (${c.duracao_texto})` : ""}
            </p>
            <div className="flex items-center justify-center gap-[8%]" style={{ fontSize: "3cqw" }}>
              <span className="flex items-center gap-1">
                <Footprints size={16} className="shrink-0" /> {meioLabel}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={16} className="shrink-0" /> {c.total_checkins} check-in(s)
              </span>
            </div>
          </div>

          <p className="font-mono text-amber-200/80" style={{ fontSize: "2.4cqw" }}>
            Certificado {c.codigo} — app Peregrino
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={compartilhar}
            disabled={gerando !== null}
            className="btn-primary flex items-center gap-2"
          >
            <Share2 size={16} /> {gerando === "compartilhar" ? "Gerando..." : "Compartilhar"}
          </button>
          <button
            onClick={baixar}
            disabled={gerando !== null}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} /> {gerando === "baixar" ? "Gerando..." : "Baixar imagem"}
          </button>
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
