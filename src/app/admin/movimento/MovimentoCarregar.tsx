"use client";

import dynamic from "next/dynamic";

// Só no navegador: a tela depende do relógio e do tema do aparelho.
const MovimentoClient = dynamic(() => import("./MovimentoClient"), {
  ssr: false,
  loading: () => <div className="card text-sm text-neutral-500">Carregando...</div>,
});

export default function MovimentoCarregar() {
  return <MovimentoClient />;
}
