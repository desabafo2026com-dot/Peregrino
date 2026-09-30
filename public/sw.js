// Service worker do O Peregrino (Rodada 50).
// Existe para o navegador reconhecer o site como app instalável (o botão
// "Instalar no telefone" passa a instalar direto no Android). Não guarda
// cópia de nada: toda página continua vindo da internet, sempre atualizada.
// Só quando a internet cai no meio de uma navegação é que mostra um aviso
// simples, em vez da tela de erro do navegador.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const PAGINA_SEM_INTERNET = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>O Peregrino — sem internet</title><style>body{font-family:system-ui,sans-serif;background:#f4f3f1;color:#3b2a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}h1{color:#8f3f19;font-size:20px}p{max-width:320px;line-height:1.4}a{display:inline-block;margin-top:16px;background:#8f3f19;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700}</style></head><body><div><h1>Sem conexão com a internet</h1><p>O Peregrino precisa de internet para abrir. Confira o sinal ou os dados móveis e tente de novo.</p><p><strong>Emergência: 190 (PM) · 191 (PRF) · 192 (SAMU) · 193 (Bombeiros)</strong></p><a href="/">Tentar de novo</a></div></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(PAGINA_SEM_INTERNET, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
