"use client";

import Link from "next/link";
import { Footprints, MapPinPlus, Users } from "lucide-react";
import type { TipoConta } from "@/lib/tipo-conta";

// Rodada 59 — escolha "Sou peregrino / Sou gerente de PAP / Sou organizador
// de Romaria", usada na página /cadastro, no cadastro por e-mail (/login) e
// no primeiro acesso com o Google (/login/completar).
const OPCOES: { tipo: TipoConta; titulo: string; desc: string }[] = [
  {
    tipo: "peregrino",
    titulo: "SOU PEREGRINO",
    desc: "Planeje sua peregrinação, registre a caminhada, receba o certificado e mande ocorrências do trajeto.",
  },
  {
    tipo: "gerente_pap",
    titulo: "SOU GERENTE DE PAP",
    desc: "Cadastre ou vincule seu Ponto de Apoio ao Peregrino e coloque suas informações para receber doações. Você também ganha o perfil de peregrino.",
  },
  {
    tipo: "organizador",
    titulo: "SOU ORGANIZADOR DE ROMARIA",
    desc: "Cadastre sua Romaria para que autoridades, PAPs e outros peregrinos saibam do seu grupo na estrada. Você também ganha o perfil de peregrino.",
  },
];

function Icone({ tipo }: { tipo: TipoConta }) {
  if (tipo === "gerente_pap") return <MapPinPlus className="shrink-0 text-amber-700" size={28} />;
  if (tipo === "organizador") return <Users className="shrink-0 text-amber-700" size={28} />;
  return <Footprints className="shrink-0 text-amber-700" size={28} />;
}

const CLASSE =
  "flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:border-amber-400 dark:border-neutral-800 dark:bg-neutral-900";

export default function EscolhaTipoConta({
  onEscolher,
  hrefs,
}: {
  onEscolher?: (tipo: TipoConta) => void;
  // Links prontos por tipo (vindo de página do servidor — função não pode
  // ser passada do servidor para um componente do navegador).
  hrefs?: Record<TipoConta, string>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {OPCOES.map((o) => {
        const conteudo = (
          <>
            <Icone tipo={o.tipo} />
            <span>
              <span className="block font-bold">{o.titulo}</span>
              <span className="block text-xs text-neutral-500">{o.desc}</span>
            </span>
          </>
        );
        return hrefs ? (
          <Link key={o.tipo} href={hrefs[o.tipo]} className={CLASSE}>
            {conteudo}
          </Link>
        ) : (
          <button key={o.tipo} type="button" onClick={() => onEscolher?.(o.tipo)} className={CLASSE}>
            {conteudo}
          </button>
        );
      })}
    </div>
  );
}
