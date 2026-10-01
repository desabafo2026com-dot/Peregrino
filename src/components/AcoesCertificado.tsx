"use client";

import { useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, Printer, Share2, X } from "lucide-react";

// Rodada 60 — botões "Baixar PDF", "Baixar imagem" e "Imprimir" dos
// certificados, revistos para o iPhone (relato: "no iPhone não consigo
// baixar o certificado e a impressão sai toda desconfigurada"):
//  - no iPhone o arquivo vai pela folha de compartilhar do sistema
//    ("Salvar Imagem" / "Salvar em Arquivos"); se o Safari não deixar abrir
//    a folha sozinho (demorou para gerar), aparece uma janela com o arquivo
//    pronto e um botão para salvar, e a imagem pode ser salva tocando e
//    segurando;
//  - a impressão agora imprime só a imagem do certificado, numa página
//    própria do tamanho certo, em vez de imprimir a página inteira do app.

function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

interface Pronto {
  blob: Blob;
  nome: string;
  url: string;
  tipo: "imagem" | "pdf";
}

export default function AcoesCertificado({
  alvo,
  nomeBase,
  pdfLarguraMm,
  pdfAlturaMm,
  larguraMinima = 1600,
}: {
  alvo: RefObject<HTMLDivElement | null>;
  nomeBase: string;
  pdfLarguraMm: number;
  pdfAlturaMm: number;
  larguraMinima?: number;
}) {
  const [gerando, setGerando] = useState<null | "imagem" | "pdf" | "imprimir">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<Pronto | null>(null);

  async function gerarPng(): Promise<string> {
    const el = alvo.current;
    if (!el) throw new Error("sem certificado");
    const { gerarPngDoElemento } = await import("@/lib/gerar-imagem");
    return gerarPngDoElemento(el, {
      larguraFinal: Math.max(larguraMinima, Math.round(el.getBoundingClientRect().width * 2)),
    });
  }

  async function entregar(blob: Blob, nome: string, tipo: Pronto["tipo"]) {
    if (ehIOS()) {
      const arquivo = new File([blob], nome, { type: blob.type });
      if (navigator.canShare?.({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo] });
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
          // Safari não deixou abrir sozinho — segue para a janela abaixo.
        }
      }
      setPronto({ blob, nome, url: URL.createObjectURL(blob), tipo });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = nome;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function baixarImagem() {
    setErro(null);
    setGerando("imagem");
    try {
      const dataUrl = await gerarPng();
      const blob = await (await fetch(dataUrl)).blob();
      await entregar(blob, `${nomeBase}.png`, "imagem");
    } catch {
      setErro("Não foi possível gerar a imagem agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  async function baixarPdf() {
    setErro(null);
    setGerando("pdf");
    try {
      const [dataUrl, { jsPDF }] = await Promise.all([gerarPng(), import("jspdf")]);
      const pdf = new jsPDF({
        orientation: pdfLarguraMm >= pdfAlturaMm ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfLarguraMm, pdfAlturaMm],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfLarguraMm, pdfAlturaMm);
      await entregar(pdf.output("blob"), `${nomeBase}.pdf`, "pdf");
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  async function imprimir() {
    setErro(null);
    // A janela precisa abrir já no toque (senão o navegador bloqueia).
    const janela = window.open("", "_blank");
    if (!janela) {
      setErro("O navegador bloqueou a janela de impressão. Permita pop-ups ou use “Baixar certificado (PDF)”.");
      return;
    }
    janela.document.write(
      '<!doctype html><meta charset="utf-8"><title>Certificado</title><p style="font-family:sans-serif;padding:24px">Preparando o certificado para impressão...</p>'
    );
    setGerando("imprimir");
    try {
      const dataUrl = await gerarPng();
      const orientacao = pdfLarguraMm >= pdfAlturaMm ? "landscape" : "portrait";
      janela.document.open();
      janela.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificado</title>
<style>
  @page { size: A4 ${orientacao}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { display: block; width: 100%; height: auto; }
  @media print { img { width: 100vw; max-height: 100vh; object-fit: contain; } }
</style></head>
<body><img src="${dataUrl}" alt="Certificado" onload="setTimeout(function(){window.focus();window.print();},400)"></body></html>`);
      janela.document.close();
    } catch {
      janela.close();
      setErro("Não foi possível preparar a impressão agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  async function compartilharDeNovo() {
    if (!pronto) return;
    const arquivo = new File([pronto.blob], pronto.nome, { type: pronto.blob.type });
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo] });
        return;
      }
    } catch {
      // cancelado
      return;
    }
    window.open(pronto.url, "_blank");
  }

  function fechar() {
    if (pronto) URL.revokeObjectURL(pronto.url);
    setPronto(null);
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2 print:hidden">
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={baixarPdf} disabled={gerando !== null} className="btn-primary flex items-center gap-2">
          <FileText size={16} /> {gerando === "pdf" ? "Gerando PDF..." : "Baixar certificado (PDF)"}
        </button>
        <button onClick={baixarImagem} disabled={gerando !== null} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> {gerando === "imagem" ? "Gerando imagem..." : "Baixar como imagem"}
        </button>
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <button
        onClick={imprimir}
        disabled={gerando !== null}
        className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        <Printer size={14} /> {gerando === "imprimir" ? "preparando impressão..." : "imprimir"}
      </button>

      {pronto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={fechar}>
            <div
              className="relative flex max-h-[90vh] w-full max-w-md flex-col items-center gap-3 overflow-y-auto rounded-2xl bg-white p-5 dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={fechar} aria-label="Fechar" className="absolute top-3 right-3 text-neutral-500">
                <X size={20} />
              </button>
              <p className="pr-6 font-bold">Seu certificado está pronto</p>
              {pronto.tipo === "imagem" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pronto.url} alt="Certificado" className="w-full rounded-lg border border-neutral-200" />
                  <p className="text-center text-xs text-neutral-500" style={{ textAlign: "center" }}>
                    Toque e segure na imagem e escolha <strong>Salvar em Fotos</strong>, ou use o botão abaixo.
                  </p>
                </>
              ) : (
                <p className="text-center text-sm text-neutral-600" style={{ textAlign: "center" }}>
                  Toque no botão abaixo e escolha <strong>Salvar em Arquivos</strong> (ou abra o PDF).
                </p>
              )}
              <button type="button" onClick={compartilharDeNovo} className="btn-primary flex w-full items-center justify-center gap-2">
                <Share2 size={16} /> Salvar / compartilhar
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
