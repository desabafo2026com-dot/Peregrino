// Service worker do O Peregrino (Rodada 50; fotos em cache na Rodada 61).
// Existe para o navegador reconhecer o site como app instalável (o botão
// "Instalar no telefone" passa a instalar direto no Android). As páginas
// continuam vindo sempre da internet, sempre atualizadas (só as fotos ficam
// guardadas — ver abaixo).
// Só quando a internet cai no meio de uma navegação é que mostra um aviso
// simples, em vez da tela de erro do navegador.
self.addEventListener("install", () => self.skipWaiting());
// Rodada 61 — as FOTOS (Supabase Storage) ficam guardadas no celular depois
// da primeira vez: abrir de novo uma lista com fotos não baixa tudo outra
// vez (era o que estourava a cota de tráfego do plano grátis do Supabase).
// Cada foto nova tem endereço próprio, então nunca aparece uma foto velha.
const CACHE_FOTOS = "peregrino-fotos-v1";
const MAX_FOTOS = 80;

self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("peregrino-fotos-") && n !== CACHE_FOTOS).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
);

async function limitarCache(cache) {
  const chaves = await cache.keys();
  for (let i = 0; i < chaves.length - MAX_FOTOS; i++) await cache.delete(chaves[i]);
}

async function fotoDoCache(request) {
  const cache = await caches.open(CACHE_FOTOS);
  const guardada = await cache.match(request);
  // Resposta "opaca" (guardada a partir de um <img>) não serve para quem
  // pede com CORS (ex.: desenhar a foto no canvas da arte) — vai à rede.
  if (guardada && !(request.mode === "cors" && guardada.type === "opaque")) return guardada;
  const resposta = await fetch(request);
  if (resposta.ok || (resposta.type === "opaque" && !guardada)) {
    cache.put(request, resposta.clone()).then(() => limitarCache(cache)).catch(() => {});
  }
  return resposta;
}

const PAGINA_SEM_INTERNET = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>O Peregrino — sem internet</title><style>body{font-family:system-ui,sans-serif;background:#f4f3f1;color:#3b2a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}h1{color:#8f3f19;font-size:20px}p{max-width:320px;line-height:1.4}a{display:inline-block;margin-top:16px;background:#8f3f19;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700}</style></head><body><div><h1>Sem conexão com a internet</h1><p>O Peregrino precisa de internet para abrir. Confira o sinal ou os dados móveis e tente de novo.</p><p><strong>Emergência: 190 (PM) · 191 (PRF) · 192 (SAMU) · 193 (Bombeiros)</strong></p><a href="/">Tentar de novo</a></div></body></html>`;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (
    req.method === "GET" &&
    req.mode !== "navigate" &&
    !req.headers.has("range") &&
    req.url.includes("/storage/v1/object/public/")
  ) {
    event.respondWith(fotoDoCache(req).catch(() => fetch(req)));
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(PAGINA_SEM_INTERNET, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
