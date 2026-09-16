import type { NextConfig } from "next";

// Cabeçalhos de segurança (Rodada 19) — reforço simples e de baixo risco,
// aplicado a toda resposta do app. Não muda nenhum comportamento visível:
// - X-Frame-Options / frame-ancestors: impede que o app seja colocado
//   dentro de um <iframe> em outro site (clickjacking) — o app não precisa
//   ser incorporado em lugar nenhum.
// - X-Content-Type-Options: impede o navegador de "adivinhar" o tipo de um
//   arquivo (ex.: tratar uma foto enviada por um usuário como script).
// - Referrer-Policy: evita vazar a URL completa (que pode conter, por
//   exemplo, o id de uma compra) para o site de destino ao clicar num link
//   que saia do app.
// - Permissions-Policy: desliga explicitamente câmera/microfone/pagamento
//   via API do navegador para qualquer origem externa incorporada (o app
//   usa a própria câmera do sistema — input file — não a API de mídia).
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
