"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Printer, Download, FileText, Award } from "lucide-react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import type { Certificado } from "@/types/database";

function formatarData(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
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

// Certificado grátis — versão simples (Rodada 15): sem a arte de pergaminho
// (essa passou a ser exclusiva de quem compra a Romaria Plus, como
// "Certificado Plus"), mas com um layout próprio, cuidado visualmente
// (faixa com a identidade do app, tipografia clara), disponível para
// qualquer peregrino que concluiu a caminhada, sem custo. O conteúdo (nome,
// trajeto, período, check-ins, código) é o mesmo do certificado pago —
// só a moldura/arte muda.
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
  const dataInicio = formatarData(c.data_inicio);
  const dataFim = formatarData(c.data_fim);
  const mesmoDia = !!(c.data_inicio && c.data_fim && dataInicio === dataFim);
  const trajetoTexto = origem ? `de ${origem} até` : "até";

  let periodoTexto: string;
  if (mesmoDia && dataInicio) {
    periodoTexto = `no dia ${dataInicio}`;
  } else if (dataInicio && dataFim) {
    periodoTexto = `no período de ${dataInicio} a ${dataFim}${c.duracao_texto ? ` (${c.duracao_texto})` : ""}`;
  } else {
    periodoTexto = c.duracao_texto ? `em ${c.duracao_texto}` : "";
  }

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
      // Mede o retângulo já renderizado (em vez de uma proporção fixa
      // hardcoded) para gerar a página do PDF com a proporção real deste
      // layout, que — diferente do certificado com imagem de fundo — não
      // tem uma proporção travada de antemão.
      const rect = ref.current.getBoundingClientRect();
      const larguraMm = 210;
      const alturaMm = (larguraMm * rect.height) / rect.width;
      const pdf = new jsPDF({
        orientation: alturaMm > larguraMm ? "portrait" : "landscape",
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
        id={`cert-gratis-${c.id}`}
        className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm dark:border-amber-900 dark:bg-neutral-900"
      >
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-800 to-amber-900 px-6 py-4 text-white">
          <Image
            src="/icons/logo-emblema.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg ring-1 ring-white/40"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-200">O Peregrino</p>
            <p className="font-serif text-lg font-bold leading-tight">Certificado de Peregrinação</p>
          </div>
          <Award className="ml-auto shrink-0 text-stripe-400" size={28} />
        </div>

        <div className="px-6 py-8 text-center">
          <p className="text-sm text-neutral-500">Certificamos que</p>
          <p className="my-2 font-serif text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {c.nome_peregrino}
          </p>
          <p className="mx-auto max-w-md text-justify text-sm text-neutral-700 dark:text-neutral-300">
            concluiu {meioLabel} sua peregrinação {trajetoTexto} a Basílica de
            Nossa Senhora Aparecida-SP {periodoTexto}, com{" "}
            <strong>{c.total_checkins}</strong> check-in(s) confirmados ao
            longo da rota.
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-dashed border-amber-200 pt-3 text-xs text-neutral-500 dark:border-amber-900">
            <span>Emitido em {formatarData(c.emitido_em)}</span>
            <span className="font-mono">Código: {c.codigo}</span>
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
