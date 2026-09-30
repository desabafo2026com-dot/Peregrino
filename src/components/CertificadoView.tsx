"use client";

import { useRef, useState } from "react";
import { Printer, Download, FileText } from "lucide-react";
import { meioNaFrase, nomeNoCertificado, checkinsNoCertificado } from "@/lib/certificado-texto";
import type { Certificado } from "@/types/database";

// Proporção real da imagem-modelo (public/certificado/modelo-certificado.jpg),
// usada para reservar o espaço certo antes da imagem carregar e para
// posicionar o texto sempre na mesma área em branco do pergaminho,
// independente do tamanho da tela.
const MODELO_LARGURA = 1179;
const MODELO_ALTURA = 896;

function formatarData(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CertificadoView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);
  const [baixando, setBaixando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Rodada 58 — texto no formato pedido pelo usuário: "concluiu com êxito,
  // nesta data, sua peregrinação (meio) até a Basílica..., saindo de
  // (origem) no dia (data), com (x) check-in(s) ... e um tempo total de (tempo)."
  const meio = meioNaFrase(c.meio_transporte, c.meio_transporte_outro_desc);
  const origem = c.origem;
  const dataInicio = formatarData(c.data_inicio);
  const checkins = checkinsNoCertificado(c.total_checkins);

  function imprimir() {
    // Marca só este certificado (útil quando há vários na mesma página) para
    // que o CSS de impressão esconda o restante da página.
    ref.current?.classList.add("print-alvo");
    document.body.classList.add("imprimindo-certificado");
    const limpar = () => {
      document.body.classList.remove("imprimindo-certificado");
      ref.current?.classList.remove("print-alvo");
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    // Dá um instante para o browser aplicar a classe antes de abrir o diálogo.
    setTimeout(() => window.print(), 50);
  }

  async function baixarImagem() {
    if (!ref.current) return;
    setErro(null);
    setBaixando(true);
    try {
      const { gerarPngDoElemento } = await import("@/lib/gerar-imagem");
      const dataUrl = await gerarPngDoElemento(ref.current, { larguraFinal: Math.max(1600, Math.round(ref.current.getBoundingClientRect().width * 2)) });
      const link = document.createElement("a");
      link.download = `certificado-peregrino-${c.codigo}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setErro("Não foi possível gerar a imagem agora. Tente novamente.");
    } finally {
      setBaixando(false);
    }
  }

  async function baixarPdf() {
    if (!ref.current) return;
    setErro(null);
    setGerandoPdf(true);
    try {
      const [{ gerarPngDoElemento }, { jsPDF }] = await Promise.all([import("@/lib/gerar-imagem"), import("jspdf")]);
      const dataUrl = await gerarPngDoElemento(ref.current, { larguraFinal: Math.max(1600, Math.round(ref.current.getBoundingClientRect().width * 2)) });
      // Página do PDF com a mesma proporção do certificado, na largura de
      // uma A4 paisagem — a imagem preenche a página inteira, sem margens.
      const larguraMm = 297;
      const alturaMm = (larguraMm * MODELO_ALTURA) / MODELO_LARGURA;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [larguraMm, alturaMm],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, larguraMm, alturaMm);
      pdf.save(`certificado-peregrino-${c.codigo}.pdf`);
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div>
      <div
        ref={ref}
        id={`cert-${c.id}`}
        className="relative mx-auto w-full max-w-2xl"
        style={{ aspectRatio: `${MODELO_LARGURA} / ${MODELO_ALTURA}`, containerType: "inline-size" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/certificado/modelo-certificado.jpg"
          alt="Certificado de Peregrinação — Fé e Conquista"
          className="absolute inset-0 h-full w-full object-contain"
          crossOrigin="anonymous"
        />

        <div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{ top: "44%", bottom: "13%", left: "10%", right: "10%" }}
        >
          <p
            className="text-neutral-600"
            style={{ fontSize: "2.3cqw", letterSpacing: "0.05em" }}
          >
            Certificamos que
          </p>
          <p
            className="font-serif font-bold text-neutral-900"
            style={{ fontSize: "4.2cqw", lineHeight: 1.15, margin: "0.4cqw 0 1cqw", letterSpacing: "0.02em" }}
          >
            {nomeNoCertificado(c.nome_peregrino)}
          </p>
          <p
            className="text-justify text-neutral-700"
            style={{ fontSize: "2.1cqw", lineHeight: 1.45, maxWidth: "95%" }}
          >
            concluiu com êxito, nesta data, sua peregrinação{meio ? ` ${meio}` : ""} até a Basílica de
            Nossa Senhora Aparecida-SP
            {origem && (
              <>
                , saindo de <strong>{origem}</strong>
              </>
            )}
            {dataInicio && <> no dia {dataInicio}</>}, com <strong>{checkins}</strong> check-in(s) confirmados
            ao longo da rota
            {c.duracao_texto && (
              <>
                {" "}e um tempo total de <strong>{c.duracao_texto}</strong>
              </>
            )}
            .
          </p>
          <div
            className="mt-[1.5cqw] flex w-full items-center justify-between text-neutral-500"
            style={{ fontSize: "1.4cqw" }}
          >
            <span>Emitido em {formatarData(c.emitido_em)}</span>
            <span className="font-mono">Código: {c.codigo}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 print:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={baixarPdf}
            disabled={gerandoPdf}
            className="btn-primary flex items-center gap-2"
          >
            <FileText size={16} /> {gerandoPdf ? "Gerando PDF..." : "Baixar certificado (PDF)"}
          </button>
          <button
            onClick={baixarImagem}
            disabled={baixando}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={16} /> {baixando ? "Gerando imagem..." : "Baixar como imagem"}
          </button>
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <button
          onClick={imprimir}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <Printer size={14} /> imprimir (alternativa)
        </button>
      </div>
    </div>
  );
}
