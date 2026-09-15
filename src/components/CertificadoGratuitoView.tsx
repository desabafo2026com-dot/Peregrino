"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Printer, Download, FileText, Award } from "lucide-react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import type { Certificado } from "@/types/database";

// Tamanho de página A4 paisagem, em mm — mesma orientação/proporção usada
// pelo Certificado Plus (Rodada 16, a pedido do usuário: "o certificado
// simples tem que ser no tamanho A4 e uma formatação típica de
// certificados"), só que sem a imagem de pergaminho (essa é exclusiva de
// quem compra a Romaria Plus).
const A4_LARGURA_MM = 297;
const A4_ALTURA_MM = 210;

function formatarData(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarDataCurta(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// O campo rota_nome é salvo como "Nome da rota (Origem → Aparecida)" — daqui
// extraímos só a cidade de origem para a frase do certificado.
function extrairOrigem(rotaNome: string | null) {
  if (!rotaNome) return null;
  const m = rotaNome.match(/\(([^→]+)→/);
  return m ? m[1].trim() : null;
}

// Certificado grátis — versão simples (Rodada 15, redesenhado na Rodada 16
// para o formato A4 e uma formatação mais próxima da de um certificado
// impresso de verdade): sem a arte de pergaminho (essa passou a ser
// exclusiva de quem compra a Romaria Plus, como "Certificado Plus"), com
// moldura, nome centralizado em destaque e uma linha de dados objetivos
// (início, término, tempo total e check-ins) — disponível para qualquer
// peregrino que concluiu a caminhada, sem custo. O conteúdo (nome, trajeto,
// período, check-ins, código) é o mesmo do certificado pago — só a
// moldura/arte muda.
export default function CertificadoGratuitoView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);
  const [baixando, setBaixando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const meioLabel =
    c.meio_transporte === "outros"
      ? c.meio_transporte_outro_desc || "outro meio de transporte"
      : c.meio_transporte
        ? MEIO_TRANSPORTE_LABELS[c.meio_transporte]
        : "a pé";

  const origem = extrairOrigem(c.rota_nome);
  const trajetoTexto = origem ? `de ${origem} até` : "até";

  function imprimir() {
    ref.current?.classList.add("print-alvo");
    document.body.classList.add("imprimindo-certificado");
    const limpar = () => {
      document.body.classList.remove("imprimindo-certificado");
      ref.current?.classList.remove("print-alvo");
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    setTimeout(() => window.print(), 50);
  }

  async function baixarImagem() {
    if (!ref.current) return;
    setErro(null);
    setBaixando(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
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
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [A4_LARGURA_MM, A4_ALTURA_MM],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, A4_LARGURA_MM, A4_ALTURA_MM);
      pdf.save(`certificado-peregrino-${c.codigo}.pdf`);
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  }

  const dados = [
    { label: "Início", valor: formatarDataCurta(c.data_inicio) },
    { label: "Término", valor: formatarDataCurta(c.data_fim) },
    { label: "Tempo total", valor: c.duracao_texto || "—" },
    { label: "Check-ins", valor: String(c.total_checkins ?? 0) },
  ];

  return (
    <div>
      <div
        ref={ref}
        id={`cert-gratis-${c.id}`}
        className="mx-auto w-full max-w-4xl bg-white text-neutral-900 dark:bg-white dark:text-neutral-900"
        style={{ aspectRatio: `${A4_LARGURA_MM} / ${A4_ALTURA_MM}`, containerType: "inline-size" }}
      >
        {/* Moldura dupla — referência clássica de certificado impresso, sem
            depender de nenhuma imagem externa. */}
        <div className="flex h-full w-full flex-col border-[3px] border-amber-800 p-[1.4cqw]">
          <div className="flex h-full w-full flex-col items-center justify-between border border-amber-300 px-[3cqw] py-[2.2cqw] text-center">
            <div className="flex flex-col items-center gap-[0.6cqw]">
              <Image
                src="/icons/logo-emblema.png"
                alt=""
                width={56}
                height={56}
                style={{ width: "4.2cqw", height: "4.2cqw" }}
                className="rounded-full ring-1 ring-amber-300"
              />
              <p
                className="font-semibold uppercase tracking-[0.3em] text-amber-700"
                style={{ fontSize: "1.1cqw" }}
              >
                O Peregrino
              </p>
              <h2
                className="font-serif font-bold uppercase tracking-[0.1em] text-amber-900"
                style={{ fontSize: "2.3cqw" }}
              >
                Certificado de Peregrinação
              </h2>
            </div>

            <div className="flex flex-col items-center gap-[0.5cqw]">
              <p className="text-neutral-500" style={{ fontSize: "1.3cqw" }}>
                Certificamos que
              </p>
              <p
                className="border-b-2 border-amber-200 px-[2cqw] pb-[0.4cqw] font-serif font-bold text-neutral-900"
                style={{ fontSize: "3cqw", lineHeight: 1.15 }}
              >
                {c.nome_peregrino}
              </p>
              <p
                className="mx-auto max-w-[85%] text-justify text-neutral-700"
                style={{ fontSize: "1.35cqw", lineHeight: 1.4, marginTop: "0.6cqw" }}
              >
                concluiu {meioLabel} sua peregrinação {trajetoTexto} a Basílica
                de Nossa Senhora Aparecida-SP, conforme os dados abaixo.
              </p>
            </div>

            <div
              className="flex w-full items-stretch justify-center divide-x divide-amber-200"
              style={{ fontSize: "1.15cqw" }}
            >
              {dados.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-[0.2cqw] px-[1.2cqw]">
                  <span className="uppercase tracking-wide text-neutral-400" style={{ fontSize: "0.85cqw" }}>
                    {d.label}
                  </span>
                  <span className="font-bold text-amber-800">{d.valor}</span>
                </div>
              ))}
            </div>

            <div
              className="flex w-full items-center justify-between border-t border-dashed border-amber-200 pt-[0.8cqw] text-neutral-500"
              style={{ fontSize: "1cqw" }}
            >
              <span>Emitido em {formatarData(c.emitido_em)}</span>
              <span className="flex items-center gap-1 font-mono">
                <Award size={14} className="text-amber-600" /> Código: {c.codigo}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 print:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={baixarPdf} disabled={gerandoPdf} className="btn-primary flex items-center gap-2">
            <FileText size={16} /> {gerandoPdf ? "Gerando PDF..." : "Baixar certificado (PDF)"}
          </button>
          <button onClick={baixarImagem} disabled={baixando} className="btn-secondary flex items-center gap-2">
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
