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
// Rodada 21: "Minha peregrinação" ganhou `elevado` — um botão circular
// "flutuando" acima da barra, com gradiente e sombra (efeito 3D/elevado),
// diferente do destaque simples (só cor) dos outros itens — a pedido do
// usuário, para ficar visualmente único e ainda mais fácil de achar.
const LINKS_PEREGRINO = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Pontos de Apoio", icon: MapPin, destaque: true },
  { href: "/peregrinacao", label: "Minha peregrinação", icon: Footprints, destaque: true, elevado: true },
  { href: "/rotas", label: "Rotas e Riscos", icon: Route },
];

const LINKS_GERENTE = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Pontos de Apoio", icon: MapPin },
  { href: "/rotas", label: "Rotas e Riscos", icon: Route },
  { href: "/gerente-pap", label: "Meu PAP", icon: MapPinPlus },
];

// Rodada 21: para uma conta que é gerente de PAP E também já usou o app
// como peregrino (perfilDuplo, ver AuthRoleProvider), "Minha peregrinação"
// passa a viver aqui, no centro da barra — igual já acontece do lado do
// peregrino — em vez de só dentro do menu de troca de perfil no topo
// (Navbar), que o usuário pediu para simplificar. "Meu PAP" continua com
// destaque de cor, e "Minha peregrinação" ganha o mesmo botão elevado.
const LINKS_GERENTE_DUPLO = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Pontos de Apoio", icon: MapPin },
  { href: "/peregrinacao", label: "Minha peregrinação", icon: Footprints, destaque: true, elevado: true },
  { href: "/gerente-pap", label: "Meu PAP", icon: MapPinPlus, destaque: true },
  { href: "/rotas", label: "Rotas e Riscos", icon: Route },
];

// Menu de navegação principal, fixo na parte inferior da tela (padrão de
// app mobile) — como pediu o usuário, ocupa o lugar que antes era do menu
// "hambúrguer" no topo. O item ativo ganha uma faixa amarela em cima,
// lembrando a faixa de pista da rodovia.
export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin, isGerente, temPerfilPeregrino } = useAuthRole();

  const base = isGerente ? (temPerfilPeregrino ? LINKS_GERENTE_DUPLO : LINKS_GERENTE) : LINKS_PEREGRINO;
  const links = isAdmin ? [...base, { href: "/admin", label: "Adm", icon: ShieldCheck }] : base;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 overflow-visible border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
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
          const elevado = "elevado" in l;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="relative flex flex-col items-center gap-1 px-1 py-2.5 text-center"
            >
              {ativo && !elevado && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-stripe-500" aria-hidden="true" />
              )}
              {elevado ? (
                // Botão circular "flutuando" acima da barra, com gradiente e
                // sombra pronunciada — dá a sensação de relevo/3D, distinto
                // do resto da barra (que é só ícone + texto, sem volume).
                <span
                  className={`-mt-6 flex items-center justify-center rounded-full border-4 border-white shadow-[0_5px_12px_rgba(0,0,0,.4)] dark:border-neutral-950 ${
                    ativo
                      ? "bg-gradient-to-b from-amber-400 to-amber-700"
                      : "bg-gradient-to-b from-amber-600 to-amber-900"
                  }`}
                  style={{ height: "3.25rem", width: "3.25rem" }}
                >
                  <l.icon size={22} className="text-white" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.5))" }} />
                </span>
              ) : (
                <l.icon
                  size={24}
                  className={destacado ? "text-amber-700 dark:text-amber-500" : "text-neutral-500 dark:text-neutral-400"}
                />
              )}
              <span
                className={`text-[11px] leading-tight font-medium ${
                  destacado ? "text-amber-700 dark:text-amber-500" : "text-neutral-500 dark:text-neutral-400"
                } ${elevado ? "-mt-0.5" : ""}`}
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
