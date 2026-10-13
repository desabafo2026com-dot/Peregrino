"use client";

import { useState, useSyncExternalStore } from "react";

// Rodada 56 — vitrine dos modelos da Romaria Plus no painel, para quem ainda
// não comprou. As imagens ficam na pasta public/imagens-plus, com os nomes
// modelo-1, modelo-2, ... (até modelo-10), em .jpg, .jpeg, .png ou .webp.
// O componente tenta cada extensão e simplesmente esconde os números que
// não existirem — dá para colocar quantas imagens quiser, sem mexer no código.
const QUANTIDADE_MAXIMA = 10;
const EXTENSOES = ["jpg", "jpeg", "png", "webp"];

// Rodada 67 — versão "mini" (página inicial, muito acessada): usa só as
// miniaturas modelo-N-mini.webp (~15 KB cada) listadas em MINIATURAS, sem
// "tentar" arquivos que não existem — cada tentativa é uma requisição a mais
// na cota da Vercel. Para trocar as imagens da página inicial é preciso
// gerar as miniaturas de novo (ver LEIA-ME.txt).
const MINIATURAS = [1, 2, 3, 4, 5];

function ImagemModelo({ numero, onFalhou, mini }: { numero: number; onFalhou: () => void; mini?: boolean }) {
  const extensoes = mini ? ["mini.webp"] : EXTENSOES;
  const [tentativa, setTentativa] = useState(0);
  const [carregada, setCarregada] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/imagens-plus/modelo-${numero}${extensoes[tentativa] === "mini.webp" ? "-mini.webp" : `.${extensoes[tentativa]}`}`}
      alt={`Modelo ${numero} da Romaria Plus`}
      loading="lazy"
      // Rodada 57 — antes ficava "display: none" até carregar, e com
      // loading="lazy" o navegador nunca carregava (imagem escondida).
      // Agora ocupa o espaço (9:16) invisível até carregar.
      className={`aspect-[9/16] ${mini ? "h-40" : "h-56"} w-auto shrink-0 snap-center rounded-xl object-cover shadow-md transition-opacity ${carregada ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setCarregada(true)}
      onError={() => {
        if (tentativa < extensoes.length - 1) setTentativa((t) => t + 1);
        else onFalhou();
      }}
    />
  );
}

const assinarNada = () => () => {};

export default function ModelosPlusVitrine({ mini = false }: { mini?: boolean }) {
  // Só monta as imagens no navegador — assim o "erro" de uma imagem que não
  // existe nunca acontece antes de o React estar ouvindo (hidratação).
  const noNavegador = useSyncExternalStore(assinarNada, () => true, () => false);
  const [ausentes, setAusentes] = useState<Set<number>>(new Set());
  const numeros = (mini ? MINIATURAS : Array.from({ length: QUANTIDADE_MAXIMA }, (_, i) => i + 1)).filter(
    (n) => !ausentes.has(n)
  );

  if (!noNavegador || numeros.length === 0) return null;

  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {numeros.map((n) => (
        <ImagemModelo
          key={n}
          numero={n}
          mini={mini}
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
