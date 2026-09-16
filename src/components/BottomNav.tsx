"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Route, Footprints, ShieldCheck, MapPinPlus } from "lucide-react";
import { useAuthRole } from "./AuthRoleProvider";

// Ordem alterada na Rodada 18 (a pedido do usuário): "Mapa" à esquerda e
// "Minha peregrinação" ao centro — com o item "Adm" (só para
// administradores) a lista fica com 5 posições, e "Minha peregrinação" cai
// exatamente no meio. Os dois ganham destaque de cor permanente.
// Rodada 20: "Mapa" renomeado para "Pontos de Apoio" (a página passou a
// mostrar só PAP, ver /mapa) e "Rotas" para "Rotas e Riscos" (reflete melhor
// o conteúdo da página, que já mostrava as rotas e a tabela/mapa de pontos
// de risco) — só o texto do item mudou, a rota (/mapa, /rotas) é a mesma.
const LINKS_PEREGRINO = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Pontos de Apoio", icon: MapPin, destaque: true },
  { href: "/peregrinacao", label: "Minha peregrinação", icon: Footprints, destaque: true },
  { href: "/rotas", label: "Rotas e Riscos", icon: Route },
];

const LINKS_GERENTE = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Pontos de Apoio", icon: MapPin },
  { href: "/rotas", label: "Rotas e Riscos", icon: Route },
  { href: "/gerente-pap", label: "Meu PAP", icon: MapPinPlus },
];

// Menu de navegação principal, fixo na parte inferior da tela (padrão de
// app mobile) — como pediu o usuário, ocupa o lugar que antes era do menu
// "hambúrguer" no topo. O item ativo ganha uma faixa amarela em cima,
// lembrando a faixa de pista da rodovia.
export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, isGerente } = useAuthRole();

  const base = isGerente ? LINKS_GERENTE : LINKS_PEREGRINO;
  const links = isAdmin ? [...base, { href: "/admin", label: "Adm", icon: ShieldCheck }] : base;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div
        className="mx-auto grid max-w-5xl"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0,1fr))` }}
      >
        {links.map((l) => {
          const ativo = pathname === l.href;
          // "Minha peregrinação" (ou "Meu PAP") fica com destaque visual
          // permanente — não só quando ativo — para ficar mais fácil de
          // encontrar, como pedido pelo usuário.
          const destacado = ativo || "destaque" in l;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="relative flex flex-col items-center gap-1 px-1 py-2.5 text-center"
            >
              {ativo && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-stripe-500" aria-hidden="true" />
              )}
              <l.icon
                size={24}
                className={destacado ? "text-amber-700 dark:text-amber-500" : "text-neutral-500 dark:text-neutral-400"}
              />
              <span
                className={`text-[11px] leading-tight font-medium ${
                  destacado ? "text-amber-700 dark:text-amber-500" : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {l.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
