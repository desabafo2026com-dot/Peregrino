"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { detectarAparelho } from "@/lib/instalar-app";

// Rodada 72 — quem abre o link do app dentro do Instagram, Facebook,
// WhatsApp, TikTok etc. fica num "navegador interno" que NÃO deixa instalar
// o app. No Android dá para pular direto para o Chrome (feito sozinho, uma
// vez por visita). No iPhone a Apple não permite isso de forma garantida:
// mostramos o botão "Abrir no Safari" (funciona nas versões mais novas) e o
// passo a passo.
const CHAVE = "peregrino_abriu_navegador";

function urlIntentChrome() {
  const { host, pathname, search, hash } = window.location;
  const destino = `${host}${pathname}${search}${hash}`;
  return `intent://${destino}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
    window.location.href
  )};end`;
}

export default function AbrirNoNavegador() {
  const [sistema, setSistema] = useState<"ios" | "android" | null>(null);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    const ap = detectarAparelho();
    if (ap.navegador !== "app-interno" || ap.sistema === "outro") return;
    const t = setTimeout(() => setSistema(ap.sistema as "ios" | "android"), 0);
    if (ap.sistema === "android") {
      let jaTentou = false;
      try {
        jaTentou = !!window.sessionStorage.getItem(CHAVE);
        window.sessionStorage.setItem(CHAVE, "1");
      } catch {}
      if (!jaTentou) {
        setTimeout(() => {
          window.location.href = urlIntentChrome();
        }, 400);
      }
    }
    return () => clearTimeout(t);
  }, []);

  if (!sistema || fechado) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[60] rounded-2xl border border-amber-300 bg-white p-4 shadow-2xl dark:border-amber-800 dark:bg-neutral-900">
      <button type="button" onClick={() => setFechado(true)} aria-label="Fechar" className="absolute top-2 right-2 text-neutral-500">
        <X size={18} />
      </button>
      <p className="pr-6 font-bold" style={{ textAlign: "left" }}>
        Abra no navegador para instalar o app
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
        {sistema === "android"
          ? "Você está no navegador de dentro de uma rede social, que não deixa instalar. Toque no botão para abrir no Chrome."
          : "Você está no navegador de dentro de uma rede social, que não deixa instalar. Toque no botão abaixo ou, se não abrir, toque em ⋯ (ou no ícone de compartilhar) e escolha “Abrir no Safari” / “Abrir no navegador”."}
      </p>
      <a
        href={
          sistema === "android"
            ? urlIntentChrome()
            : `x-safari-https://${window.location.host}${window.location.pathname}${window.location.search}`
        }
        className="btn-primary mt-3 flex items-center justify-center gap-2"
      >
        <ExternalLink size={16} /> {sistema === "android" ? "Abrir no Chrome" : "Abrir no Safari"}
      </a>
    </div>
  );
}
