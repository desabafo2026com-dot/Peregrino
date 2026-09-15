"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Download, FileText, Tent, MapPin } from "lucide-react";
import { BR_LABELS, SENTIDO_PISTA_LABELS } from "@/lib/constants";
import type { PontoApoio } from "@/types/database";

// Cartaz A5-friendly (proporção 3:4), pensado para imprimir e fixar no
// próprio PAP: o peregrino escaneia o QR code e cai direto na página
// pública daquele ponto (/pap/[id]), sem precisar abrir o app inteiro.
const CARTAZ_LARGURA = 900;
const CARTAZ_ALTURA = 1200;

export default function PapQrCode({ ponto, url }: { ponto: PontoApoio; url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [gerando, setGerando] = useState<"pdf" | "imagem" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#3b2416" } }).then(
      setQrDataUrl
    );
  }, [url]);

  async function baixarImagem() {
    if (!ref.current) return;
    setErro(null);
    setGerando("imagem");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `pap-qrcode-${ponto.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setErro("Não foi possível gerar a imagem agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  async function baixarPdf() {
    if (!ref.current) return;
    setErro(null);
    setGerando("pdf");
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
      const larguraMm = 148; // A5
      const alturaMm = (larguraMm * CARTAZ_ALTURA) / CARTAZ_LARGURA;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [larguraMm, alturaMm] });
      pdf.addImage(dataUrl, "PNG", 0, 0, larguraMm, alturaMm);
      pdf.save(`pap-qrcode-${ponto.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div>
      <div
        ref={ref}
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-amber-200 bg-white text-center text-neutral-900 shadow-lg dark:border-amber-900"
        style={{ aspectRatio: `${CARTAZ_LARGURA} / ${CARTAZ_ALTURA}`, containerType: "inline-size" }}
      >
        <div className="absolute inset-x-0 top-0 h-[2%] bg-stripe-400" />
        <div className="absolute inset-0 flex flex-col items-center justify-between px-[8%] pb-[6%] pt-[8%]">
          <div className="flex flex-col items-center gap-[2%]">
            <Image
              src="/icons/logo-emblema.png"
              alt=""
              width={120}
              height={120}
              style={{ width: "30%", height: "auto" }}
              className="rounded-lg"
            />
            <p className="font-semibold tracking-[0.15em] text-amber-800" style={{ fontSize: "3cqw" }}>
              APP O PEREGRINO
            </p>
          </div>

          <div className="flex flex-col items-center gap-[2%]">
            <p className="flex items-center gap-1 font-bold" style={{ fontSize: "5cqw" }}>
              <Tent size={20} className="shrink-0 text-green-700" />
              {ponto.nome}
            </p>
            <p className="flex items-center gap-1 text-neutral-600" style={{ fontSize: "3cqw" }}>
              <MapPin size={14} className="shrink-0" />
              {ponto.cidade ?? "—"} — {BR_LABELS[ponto.br] ?? ponto.br}
              {ponto.km_referencia != null ? ` — km ${ponto.km_referencia}` : ""}
              {ponto.sentido_pista ? ` (${SENTIDO_PISTA_LABELS[ponto.sentido_pista] ?? ""})` : ""}
            </p>
          </div>

          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code" style={{ width: "55%", height: "auto" }} />
          )}

          <p className="text-neutral-500" style={{ fontSize: "2.6cqw" }}>
            Aponte a câmera do celular para ver informações deste ponto de
            apoio no app O Peregrino
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={baixarPdf}
            disabled={gerando !== null || !qrDataUrl}
            className="btn-primary flex items-center gap-2"
          >
            <FileText size={16} /> {gerando === "pdf" ? "Gerando..." : "Baixar cartaz (PDF)"}
          </button>
          <button
            onClick={baixarImagem}
            disabled={gerando !== null || !qrDataUrl}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} /> {gerando === "imagem" ? "Gerando..." : "Baixar como imagem"}
          </button>
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
