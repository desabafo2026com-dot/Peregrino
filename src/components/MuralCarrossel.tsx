"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HandHeart, Heart } from "lucide-react";

// Rodada 65 — carrossel de mensagens (mural de pedidos e agradecimentos e
// agradecimentos aos PAPs): uma por vez, trocando a cada 4 segundos.
export interface ItemMural {
  id: string;
  rotulo: string; // ex.: "Pedido", "Agradecimento", "Para o PAP X"
  texto: string;
  autor: string; // "Maria, de Taubaté"
}

const INTERVALO_MS = 4000;

export default function MuralCarrossel({
  titulo,
  itens,
  verTodosHref,
  variante = "mural",
}: {
  titulo: string;
  itens: ItemMural[];
  verTodosHref?: string;
  variante?: "mural" | "pap";
}) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (itens.length <= 1) return;
    const id = setInterval(() => setIndice((i) => (i + 1) % itens.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, [itens.length]);

  if (itens.length === 0) return null;
  const atual = itens[indice % itens.length];
  const Icone = variante === "pap" ? Heart : HandHeart;

  return (
    <section
      className={`card flex flex-col gap-2 ${
        variante === "pap"
          ? "border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20"
          : "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          className={`flex items-center gap-2 text-sm font-bold ${
            variante === "pap" ? "text-green-800 dark:text-green-400" : "text-sky-900 dark:text-sky-300"
          }`}
        >
          <Icone size={18} /> {titulo}
        </h2>
        {verTodosHref && (
          <Link href={verTodosHref} className="shrink-0 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-500">
            Ver todos →
          </Link>
        )}
      </div>
      <div key={atual.id} className="mensagem-conquista-fade min-h-[4.5rem]">
        <p className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase" style={{ textAlign: "left" }}>
          {atual.rotulo}
        </p>
        <p className="text-neutral-700 italic dark:text-neutral-200" style={{ textAlign: "left" }}>
          &quot;{atual.texto}&quot;
        </p>
        <p className="mt-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400" style={{ textAlign: "left" }}>
          — {atual.autor}
        </p>
      </div>
      {itens.length > 1 && (
        <div className="flex justify-center gap-1" aria-hidden="true">
          {itens.slice(0, 12).map((it, i) => (
            <span
              key={it.id}
              className={`h-1.5 w-1.5 rounded-full ${i === indice % Math.min(itens.length, 12) ? "bg-neutral-500" : "bg-neutral-300 dark:bg-neutral-700"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
