"use client";

import { useEffect, useState } from "react";
import { carregarImagem, imagemParaCanvas, limparBrancoTodo } from "@/lib/efeito-carimbo";

// Rodada 77 — imagem própria do carimbo de um PAP. Imagens antigas (salvas
// antes de virar "carimbo") podem ter fundo ou interior branco: aqui o
// branco some na hora de mostrar, sem mexer no arquivo. Se não der (ex.:
// o navegador bloquear a leitura da imagem), mostra a imagem como está.
const cache = new Map<string, string>();

export default function ImagemCarimbo({ src }: { src: string }) {
  const [limpa, setLimpa] = useState<string | null>(cache.get(src) ?? null);

  useEffect(() => {
    if (cache.has(src)) return;
    let vivo = true;
    carregarImagem(src, true)
      .then((img) => {
        const canvas = imagemParaCanvas(img, 600);
        limparBrancoTodo(canvas);
        const url = canvas.toDataURL("image/png");
        cache.set(src, url);
        if (vivo) setLimpa(url);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={limpa ?? src} alt="" className="aspect-square w-full object-contain" />
  );
}
