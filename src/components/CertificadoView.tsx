"use client";

import { useRef, useState } from "react";
import { Printer, Download } from "lucide-react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
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

// O campo rota_nome é salvo como "Nome da rota (Origem → Aparecida)" — daqui
// extraímos só a cidade de origem para a frase do certificado.
function extrairOrigem(rotaNome: string | null) {
  if (!rotaNome) return null;
  const m = rotaNome.match(/\(([^→]+)→/);
  return m ? m[1].trim() : null;
}

export default function CertificadoView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);
  const [baixando, setBaixando] = useState(false);
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
          style={{ top: "61%", bottom: "15%", left: "10%", right: "10%" }}
        >
          <p
            className="text-neutral-600"
            style={{ fontSize: "2.1cqw", letterSpacing: "0.05em" }}
          >
            Certificamos que
          </p>
          <p
            className="font-serif font-bold text-neutral-900"
            style={{ fontSize: "4cqw", lineHeight: 1.15, margin: "0.3cqw 0" }}
          >
            {c.nome_peregrino}
          </p>
          <p
            className="text-justify text-neutral-700"
            style={{ fontSize: "1.9cqw", lineHeight: 1.35, maxWidth: "95%" }}
          >
            concluiu {meioLabel} sua peregrinação {trajetoTexto} a Basílica de
            Nossa Senhora Aparecida-SP {periodoTexto}, com{" "}
            <strong>{c.total_checkins}</strong> check-in(s) confirmados ao
            longo da rota.
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
        <button
          onClick={baixarImagem}
          disabled={baixando}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={16} /> {baixando ? "Gerando imagem..." : "Baixar certificado (imagem)"}
        </button>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <Printer size={14} /> imprimir (alternativa)
        </button>
      </div>
    </div>
  );
}
