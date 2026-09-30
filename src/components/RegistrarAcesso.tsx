"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { detectarAparelho } from "@/lib/instalar-app";

// Rodada 50 — contador de acessos ao site, para o administrador ver se está
// tendo movimento (inclusive de quem não tem cadastro). Cada aparelho ganha
// um código aleatório guardado só no próprio navegador — nenhum dado
// pessoal: não guarda nome, e-mail nem endereço IP. Conta 1 acesso por vez
// que a pessoa abre o site (sessão do navegador), e o banco ainda ignora
// repetições do mesmo aparelho em menos de 30 minutos (ver registrar_acesso
// na Migration 44). As páginas da administração ficam de fora.
const CHAVE_VISITANTE = "peregrino_visitante";
const CHAVE_SESSAO = "peregrino_acesso_contado";

function lerOuCriarVisitante(): string | null {
  try {
    let id = window.localStorage.getItem(CHAVE_VISITANTE);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(CHAVE_VISITANTE, id);
    }
    return id;
  } catch {
    return null;
  }
}

export default function RegistrarAcesso() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      if (window.sessionStorage.getItem(CHAVE_SESSAO)) return;
      window.sessionStorage.setItem(CHAVE_SESSAO, "1");
    } catch {
      // sem sessionStorage — o próprio banco evita contar em dobro
    }
    const visitante = lerOuCriarVisitante() ?? crypto.randomUUID();
    const { sistema } = detectarAparelho();
    const appInstalado = window.matchMedia("(display-mode: standalone)").matches;
    const supabase = createClient();
    // Sem a Migration 44 a função não existe — falha em silêncio. O .then()
    // é necessário: o supabase só envia a chamada quando alguém espera o
    // resultado.
    supabase.rpc("registrar_acesso", {
      p_visitante: visitante,
      p_pagina: pathname,
      p_app_instalado: appInstalado,
      p_dispositivo: sistema === "outro" ? "computador" : sistema,
    }).then(() => {});
  }, [pathname]);

  return null;
}
