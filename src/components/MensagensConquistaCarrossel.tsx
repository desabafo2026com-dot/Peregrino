"use client";

import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import type { MensagemConquista } from "@/types/database";

// Carrossel de mensagens públicas de conquista (Rodada 27) — mostra uma
// mensagem por vez, trocando a cada 7 segundos, na home, acima do botão de
// "Planejar peregrinação" (posição pedida pelo usuário). Recebe até 30
// mensagens (as mais recentes, já filtradas no servidor) e passa por elas em
// loop — se a lista tiver poucas mensagens novas no momento, tudo bem
// repetir o mesmo conjunto mais de uma vez até a próxima pessoa concluir e
// publicar uma mensagem nova (é assim que o usuário pediu que funcionasse).
const INTERVALO_MS = 7000;

export default function MensagensConquistaCarrossel({ mensagens }: { mensagens: MensagemConquista[] }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (mensagens.length <= 1) return;
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % mensagens.length);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [mensagens.length]);

  if (mensagens.length === 0) return null;

  // Se a lista mudar de tamanho entre carregamentos (nova mensagem chegou),
  // evita apontar para um índice que não existe mais.
  const atual = mensagens[indice % mensagens.length];

  return (
    <section
      key={atual.id}
      className="card mensagem-conquista-fade flex items-start gap-3 border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
      aria-live="polite"
    >
      <Quote size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-500" />
      <div className="min-w-0">
        <p className="italic text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
          &quot;{atual.mensagem}&quot;
        </p>
        <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-500">
          — {atual.nome}
          {atual.cidade ? `, de ${atual.cidade}` : ""}
        </p>
      </div>
    </section>
  );
}
