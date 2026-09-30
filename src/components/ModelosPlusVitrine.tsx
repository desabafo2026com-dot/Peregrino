"use client";

import { useState, useSyncExternalStore } from "react";

// Rodada 56 — vitrine dos modelos da Romaria Plus no painel, para quem ainda
// não comprou. As imagens ficam na pasta public/imagens-plus, com os nomes
// modelo-1, modelo-2, ... (até modelo-10), em .jpg, .jpeg, .png ou .webp.
// O componente tenta cada extensão e simplesmente esconde os números que
// não existirem — dá para colocar quantas imagens quiser, sem mexer no código.
const QUANTIDADE_MAXIMA = 10;
const EXTENSOES = ["jpg", "jpeg", "png", "webp"];

function ImagemModelo({ numero, onFalhou }: { numero: number; onFalhou: () => void }) {
  const [tentativa, setTentativa] = useState(0);
  const [carregada, setCarregada] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/imagens-plus/modelo-${numero}.${EXTENSOES[tentativa]}`}
      alt={`Modelo ${numero} da Romaria Plus`}
      loading="lazy"
      className={`h-56 w-auto shrink-0 snap-center rounded-xl object-cover shadow-md ${carregada ? "" : "hidden"}`}
      onLoad={() => setCarregada(true)}
      onError={() => {
        if (tentativa < EXTENSOES.length - 1) setTentativa((t) => t + 1);
        else onFalhou();
      }}
    />
  );
}

const assinarNada = () => () => {};

export default function ModelosPlusVitrine() {
  // Só monta as imagens no navegador — assim o "erro" de uma imagem que não
  // existe nunca acontece antes de o React estar ouvindo (hidratação).
  const noNavegador = useSyncExternalStore(assinarNada, () => true, () => false);
  const [ausentes, setAusentes] = useState<Set<number>>(new Set());
  const numeros = Array.from({ length: QUANTIDADE_MAXIMA }, (_, i) => i + 1).filter((n) => !ausentes.has(n));

  if (!noNavegador || numeros.length === 0) return null;

  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {numeros.map((n) => (
        <ImagemModelo
          key={n}
          numero={n}
          onFalhou={() =>
            setAusentes((prev) => {
              const novo = new Set(prev);
              novo.add(n);
              return novo;
            })
          }
        />
      ))}
    </div>
  );
}
