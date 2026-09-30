"use client";

import { useSyncExternalStore } from "react";

// Rodada 50 — instalar o app direto pelo botão "Instalar no telefone".
//
// O Android (Chrome, Samsung Internet, Edge) avisa a página, com o evento
// `beforeinstallprompt`, quando o site pode ser instalado; guardando esse
// evento dá para abrir a janela oficial de instalação ao tocar no botão —
// e o ícone é criado na tela inicial na hora. O evento chega logo que a
// página carrega (às vezes antes do React), por isso é capturado por um
// script bem no começo do <head> (ver SCRIPT_CAPTURA_INSTALACAO, usado no
// layout) e guardado em window.__pwa.
//
// No iPhone/iPad a Apple não deixa nenhum site fazer isso sozinho: o único
// caminho é o próprio Safari (Compartilhar > Adicionar à Tela de Início).
// Lá o botão abre um passo a passo visual.

export const SCRIPT_CAPTURA_INSTALACAO = `(function(){try{var w=window;w.__pwa=w.__pwa||{prompt:null,instalado:false};w.addEventListener('beforeinstallprompt',function(e){e.preventDefault();w.__pwa.prompt=e;w.dispatchEvent(new Event('pwa-mudou'));});w.addEventListener('appinstalled',function(){w.__pwa.prompt=null;w.__pwa.instalado=true;w.dispatchEvent(new Event('pwa-mudou'));});if('serviceWorker' in navigator){w.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}}catch(e){}})();`;

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface EstadoPwa {
  prompt: EventoInstalacao | null;
  instalado: boolean;
}

declare global {
  interface Window {
    __pwa?: EstadoPwa;
  }
}

export type SistemaAparelho = "ios" | "android" | "outro";
// "safari" | "outro-ios" (Chrome/Firefox no iPhone, que não instalam) |
// "app-interno" (navegador de dentro do Instagram/Facebook/etc.)
export type NavegadorAparelho = "safari" | "outro-ios" | "app-interno" | "padrao";

export function detectarAparelho(): { sistema: SistemaAparelho; navegador: NavegadorAparelho } {
  if (typeof navigator === "undefined") return { sistema: "outro", navegador: "padrao" };
  const ua = navigator.userAgent || "";
  const ipadComoMac = /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  const sistema: SistemaAparelho = /iPhone|iPad|iPod/.test(ua) || ipadComoMac ? "ios" : /Android/.test(ua) ? "android" : "outro";
  const appInterno = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|TikTok|musical_ly|Snapchat|; wv\)/.test(ua);
  let navegador: NavegadorAparelho = "padrao";
  if (appInterno) navegador = "app-interno";
  else if (sistema === "ios") navegador = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? "outro-ios" : "safari";
  return { sistema, navegador };
}

function assinar(aoMudar: () => void) {
  window.addEventListener("pwa-mudou", aoMudar);
  const midia = window.matchMedia("(display-mode: standalone)");
  midia.addEventListener?.("change", aoMudar);
  return () => {
    window.removeEventListener("pwa-mudou", aoMudar);
    midia.removeEventListener?.("change", aoMudar);
  };
}

// Um texto curto que muda sempre que algo relevante muda — o
// useSyncExternalStore compara por igualdade, então não pode devolver um
// objeto novo a cada leitura.
function lerEstado(): string {
  const pwa = window.__pwa;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return `${pwa?.prompt ? 1 : 0}|${pwa?.instalado || standalone ? 1 : 0}`;
}

export function useInstalarApp() {
  const estado = useSyncExternalStore(assinar, lerEstado, () => "0|0");
  const [podeInstalarDireto, jaInstalado] = estado.split("|").map((v) => v === "1");

  async function instalar(): Promise<"instalado" | "recusado" | "indisponivel"> {
    const evento = window.__pwa?.prompt;
    if (!evento) return "indisponivel";
    await evento.prompt();
    const escolha = await evento.userChoice;
    // O mesmo evento só pode ser usado uma vez.
    if (window.__pwa) window.__pwa.prompt = null;
    window.dispatchEvent(new Event("pwa-mudou"));
    return escolha.outcome === "accepted" ? "instalado" : "recusado";
  }

  return { podeInstalarDireto, jaInstalado, instalar };
}
