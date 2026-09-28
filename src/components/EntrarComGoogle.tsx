"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

// Rodada 40 — "Continuar com o Google": a pessoa entra com a conta Google que
// já está no celular, sem criar senha e sem precisar abrir o e-mail de
// confirmação (o que vinha assustando parte do público, ver
// deploy-info-rodada40.md). A volta do Google cai em /auth/callback.
//
// O Google bloqueia o login dentro do navegador embutido de alguns apps
// (Facebook, Instagram, Messenger, TikTok...) — lá aparece um erro
// "403: disallowed_useragent". Como os links do app circulam em grupos,
// detectamos esses navegadores e, em vez do botão, explicamos como abrir o
// link no navegador de verdade. WhatsApp e Telegram abrem links no
// navegador normal do celular, então funcionam direto.
const NAVEGADOR_EMBUTIDO = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|musical_ly|TikTok|BytedanceWebview|Snapchat|; wv\)/i;

function lerUserAgent() {
  return navigator.userAgent;
}
function semAssinatura() {
  return () => {};
}

export default function EntrarComGoogle({
  tipo,
  redirect,
}: {
  tipo: string | null;
  redirect: string | null;
}) {
  // useSyncExternalStore evita diferença entre o HTML do servidor (sem
  // navegador, string vazia) e o do celular na hora de hidratar a página.
  const userAgent = useSyncExternalStore(semAssinatura, lerUserAgent, () => "");
  const embutido = NAVEGADOR_EMBUTIDO.test(userAgent);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function entrar() {
    setErro(null);
    setCarregando(true);
    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (redirect) params.set("redirect", redirect);
    const qs = params.toString();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`,
        // Sempre mostra a lista de contas — importante em celular
        // compartilhado pela família.
        queryParams: { prompt: "select_account" },
      },
    });
    // Em caso de sucesso o navegador já está indo para o Google; só
    // chegamos aqui de volta se algo falhou antes disso.
    if (error) {
      setCarregando(false);
      setErro("Não foi possível abrir o login do Google agora. Tente de novo ou use seu e-mail.");
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  if (embutido) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="mb-2 font-semibold">Quer entrar com sua conta Google?</p>
        <p className="mb-3">
          Este link abriu dentro de outro aplicativo, e o Google não permite
          entrar por aqui. Toque nos <strong>três pontinhos</strong> (ou no
          ícone de compartilhar) no canto da tela e escolha{" "}
          <strong>&quot;Abrir no navegador&quot;</strong> (Chrome ou Safari). Se
          preferir, continue abaixo com seu e-mail.
        </p>
        <button type="button" onClick={copiarLink} className="btn-secondary w-full">
          {copiado ? "Link copiado — cole no navegador" : "Copiar o link desta página"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={entrar}
        disabled={carregando}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:bg-white dark:text-neutral-800"
      >
        <LogoGoogle />
        {carregando ? "Abrindo o Google..." : "Continuar com o Google"}
      </button>
      <p className="text-center text-xs text-neutral-500">
        Mais rápido: sem criar senha e sem e-mail de confirmação.
      </p>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}

// "G" colorido do Google, no formato pedido pelas regras de marca do
// próprio Google para botões de login.
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
