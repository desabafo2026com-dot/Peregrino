"use client";

import { useRef, useState } from "react";
import { Printer, Download } from "lucide-react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import type { Certificado } from "@/types/database";

function formatarData(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Pequeno medalhão (cruz num círculo dourado) usado nos quatro cantos da
// moldura — ornamento original, desenhado em SVG puro (sem imagens
// externas) para que a exportação em PNG nunca dependa de carregar um
// arquivo à parte.
function CornerMedallion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="14" fill="url(#pgrGoldGrad)" stroke="#7a5717" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#7a5717" strokeWidth="0.75" />
      <path
        d="M16 9v14M9 16h14"
        stroke="#7a5717"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Medalhão central: basílica estilizada (torres, cúpula e cruz) sobre uma
// colina, com uma faixa de texto curva por baixo — ilustração original em
// SVG, na mesma linguagem visual do selo do app, mas desenhada aqui como
// vetor para caber no certificado sem depender de imagem externa.
function CentralMedallion({ ano, idSuffix }: { ano: number; idSuffix: string }) {
  const arcoId = `pgrArcoTexto-${idSuffix}`;
  return (
    <svg viewBox="0 0 140 140" className="h-32 w-32">
      <circle cx="70" cy="70" r="64" fill="url(#pgrGoldGrad)" stroke="#7a5717" strokeWidth="2" />
      <circle cx="70" cy="70" r="56" fill="none" stroke="#7a5717" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="70" cy="70" r="50" fill="#f6e6b4" stroke="#9c7a2e" strokeWidth="1" />

      {/* estrelas em arco no topo */}
      {[-40, -20, 0, 20, 40].map((ang) => {
        const rad = (ang * Math.PI) / 180;
        const x = 70 + 34 * Math.sin(rad);
        const y = 44 - 34 * Math.cos(rad) + 6;
        return <circle key={ang} cx={x} cy={y} r="1.6" fill="#7a5717" />;
      })}

      {/* colina */}
      <path d="M18 100 Q70 82 122 100 L122 118 L18 118 Z" fill="#c9a53f" />
      {/* estrada com pegadas */}
      <path d="M70 100 L64 118 M70 100 L76 118" stroke="#9c7a2e" strokeWidth="3" strokeLinecap="round" />
      <circle cx="68" cy="108" r="1.3" fill="#7a5717" />
      <circle cx="72" cy="112" r="1.3" fill="#7a5717" />

      {/* torres */}
      <rect x="42" y="72" width="9" height="26" fill="#8a6a28" />
      <path d="M42 72 L46.5 63 L51 72 Z" fill="#7a5717" />
      <rect x="89" y="72" width="9" height="26" fill="#8a6a28" />
      <path d="M89 72 L93.5 63 L98 72 Z" fill="#7a5717" />

      {/* corpo central + cúpula */}
      <rect x="58" y="80" width="24" height="18" fill="#8a6a28" />
      <path d="M58 80 A12 12 0 0 1 82 80 Z" fill="#7a5717" />
      <path d="M70 68 v-8 M66.5 63 h7" stroke="#7a5717" strokeWidth="1.6" strokeLinecap="round" />

      {/* faixa curva com texto */}
      <path id={arcoId} d="M28 96 A42 42 0 0 1 112 96" fill="none" />
      <text fontSize="8.5" fill="#7a5717" fontWeight="700" letterSpacing="1">
        <textPath href={`#${arcoId}`} startOffset="50%" textAnchor="middle">
          FÉ E CONQUISTA
        </textPath>
      </text>

      <text x="70" y="46" fontSize="11" fill="#7a5717" fontWeight="700" textAnchor="middle">
        {ano}
      </text>
    </svg>
  );
}

// Selo/fita dourada no rodapé, no estilo de medalha de honraria.
function SealRibbon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 74" className={className}>
      <path d="M16 32 L24 68 L30 54 L36 68 L44 32 Z" fill="url(#pgrRibbonGrad)" />
      <circle cx="30" cy="26" r="18" fill="url(#pgrGoldGrad)" stroke="#7a5717" strokeWidth="1.5" />
      <path
        d="M30 14 l2.6 7.2 7.6.1 -6.1 4.7 2.3 7.3 -6.4-4.5 -6.4 4.5 2.3-7.3 -6.1-4.7 7.6-.1z"
        fill="#7a5717"
      />
    </svg>
  );
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

  async function baixarImagem() {
    if (!ref.current) return;
    setErro(null);
    setBaixando(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#fdf6e0" });
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
        className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl p-8 text-center text-neutral-800"
        style={{
          background: "radial-gradient(ellipse at top, #fdf6e0, #f3e4b8 60%, #ecdb9e)",
        }}
      >
        <svg width="0" height="0" className="absolute">
          <defs>
            <radialGradient id="pgrGoldGrad" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#f6e6ae" />
              <stop offset="55%" stopColor="#d9b856" />
              <stop offset="100%" stopColor="#a9822f" />
            </radialGradient>
            <linearGradient id="pgrRibbonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9b856" />
              <stop offset="100%" stopColor="#a9822f" />
            </linearGradient>
          </defs>
        </svg>

        <div className="pointer-events-none absolute inset-3 rounded-xl border-[3px] border-amber-800/90" />
        <div className="pointer-events-none absolute inset-5 rounded-lg border border-dashed border-amber-700/60" />

        <CornerMedallion className="absolute top-1.5 left-1.5 h-9 w-9" />
        <CornerMedallion className="absolute top-1.5 right-1.5 h-9 w-9" />
        <CornerMedallion className="absolute bottom-1.5 left-1.5 h-9 w-9" />
        <CornerMedallion className="absolute bottom-1.5 right-1.5 h-9 w-9" />

        <div className="relative flex flex-col items-center gap-1 py-2">
          <p className="text-xs tracking-[0.3em] text-amber-700 uppercase">
            Certificado de Peregrinação
          </p>
          <h2 className="mb-1 font-serif text-2xl font-bold text-amber-900">
            Rodovia Presidente Dutra — Aparecida-SP
          </h2>

          <CentralMedallion ano={new Date(c.emitido_em).getFullYear()} idSuffix={c.id} />

          <p className="mt-2 text-sm text-neutral-600">Certificamos que</p>
          <p className="mb-2 font-serif text-3xl font-bold text-neutral-900">{c.nome_peregrino}</p>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-neutral-700">
            concluiu {meioLabel} sua peregrinação até a Basílica de Nossa
            Senhora Aparecida{c.rota_nome ? `, ${c.rota_nome}` : ""},
            percorrendo o trajeto em{" "}
            <strong>{c.duracao_texto ?? `${c.dias_caminhada ?? "-"} dia(s)`}</strong>,
            entre <strong>{formatarData(c.data_inicio)}</strong> e{" "}
            <strong>{formatarData(c.data_fim)}</strong>, com{" "}
            <strong>{c.total_checkins}</strong> check-in(s) confirmados ao
            longo da rota.
          </p>

          <div className="mt-6 flex w-full items-center justify-between border-t border-amber-300/70 pt-3 text-xs text-neutral-500">
            <span>Emitido em {formatarData(c.emitido_em)}</span>
            <SealRibbon className="h-10 w-10 shrink-0" />
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
