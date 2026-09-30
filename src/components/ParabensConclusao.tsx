"use client";

import { createPortal } from "react-dom";
import { Trophy } from "lucide-react";

// Rodada 55 — mensagem de parabéns ao concluir a peregrinação com
// certificado, no estilo da referência enviada pelo usuário: fundo escuro,
// troféu dourado, "PARABÉNS!!!" e o botão amarelo "RECEBER", que leva ao
// certificado. Com uma chuva de confetes leve em CSS.
// Dourado fixo (a paleta "amber" do app foi personalizada para o marrom da
// marca, então não serve aqui).
// Rodada 57 — laranja do ícone no lugar do amarelo.
const OURO = "#f5a54a";

const CORES_CONFETE = ["#e0892b", "#f5a54a", "#ffffff", "#1f3b6b", "#60a5fa", "#fcd9b0"];

export default function ParabensConclusao({ onReceber }: { onReceber: () => void }) {
  const confetes = Array.from({ length: 28 }, (_, i) => ({
    esquerda: (i * 37) % 100,
    atraso: (i % 7) * 0.35,
    duracao: 2.6 + (i % 5) * 0.4,
    cor: CORES_CONFETE[i % CORES_CONFETE.length],
    giro: (i * 47) % 360,
  }));

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5">
      <style>{`
        @keyframes confete-cair { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; } }
        @keyframes trofeu-brilho { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(251,191,36,.55)); } 50% { transform: scale(1.06); filter: drop-shadow(0 0 22px rgba(251,191,36,.85)); } }
      `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {confetes.map((c, i) => (
          <span
            key={i}
            className="absolute top-0 block h-3 w-2 rounded-sm"
            style={{
              left: `${c.esquerda}%`,
              background: c.cor,
              transform: `rotate(${c.giro}deg)`,
              animation: `confete-cair ${c.duracao}s linear ${c.atraso}s infinite`,
            }}
          />
        ))}
      </div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parabens-titulo"
        className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl px-7 pt-8 pb-7 text-center text-white shadow-2xl"
        style={{ background: "radial-gradient(circle at 50% 20%, #2a3a66 0%, #172340 55%, #0e1628 100%)" }}
      >
        <h2 id="parabens-titulo" className="text-2xl font-extrabold tracking-wide" style={{ color: OURO }}>
          PARABÉNS!!!
        </h2>
        <Trophy size={84} strokeWidth={1.6} style={{ color: OURO, animation: "trofeu-brilho 2.4s ease-in-out infinite" }} />
        <p className="text-base leading-relaxed text-white/95" style={{ textAlign: "center" }}>
          Foi com muita <strong style={{ color: OURO }}>FÉ E DEDICAÇÃO</strong> que você completou o percurso desta{" "}
          <strong style={{ color: OURO }}>PEREGRINAÇÃO</strong> e conquistou seu{" "}
          <strong style={{ color: OURO }}>CERTIFICADO DE CONCLUSÃO</strong>. Clique abaixo para recebê-lo!
        </p>
        <button
          type="button"
          onClick={onReceber}
          className="mt-2 w-full rounded-full py-3 text-lg font-extrabold tracking-wide text-[#172340] shadow-lg transition hover:brightness-110 active:scale-[0.98]"
          style={{ background: OURO }}
        >
          RECEBER
        </button>
      </div>
    </div>,
    document.body
  );
}
