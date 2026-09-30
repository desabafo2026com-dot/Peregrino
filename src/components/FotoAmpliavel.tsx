"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Rodada 57 — miniatura de foto que abre em tela cheia ao tocar (usada na
// lista de pontos de risco, em "Rotas e Riscos").
export default function FotoAmpliavel({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={className} aria-label={`Ampliar: ${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="h-full w-full rounded-lg object-cover" />
      </button>
      {aberta &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setAberta(false)}
            role="dialog"
            aria-label={alt}
          >
            <button type="button" aria-label="Fechar" className="absolute top-4 right-4 text-white" onClick={() => setAberta(false)}>
              <X size={28} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-full max-w-full rounded-xl object-contain" />
          </div>,
          document.body
        )}
    </>
  );
}
