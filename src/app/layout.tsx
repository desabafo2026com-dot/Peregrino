import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import EmergencyButton from "@/components/EmergencyButton";
import LocationSharingManager from "@/components/LocationSharingManager";
import { AuthRoleProvider } from "@/components/AuthRoleProvider";
import TermosGate from "@/components/TermosGate";
import CompletarCadastroGate from "@/components/CompletarCadastroGate";
import RegistrarAcesso from "@/components/RegistrarAcesso";
import { SCRIPT_CAPTURA_INSTALACAO } from "@/lib/instalar-app";

// Rodada 40 — prévia do link ao ser colado no WhatsApp/Facebook/Telegram.
// Antes não havia imagem nem textos de compartilhamento (Open Graph), então
// o link aparecia "pelado" nos grupos, o que reforçava a impressão de link
// suspeito relatada pelo usuário. A imagem é o arquivo
// src/app/opengraph-image.jpg (1200x630, convenção de arquivo do Next.js);
// estes são os textos que acompanham.
//
// metadataBase: o WhatsApp exige endereço absoluto para a imagem. Usa
// NEXT_PUBLIC_SITE_URL se um dia for configurada (ex.: domínio próprio) e,
// senão, a variável que a própria Vercel preenche sozinha com o endereço de
// produção do projeto (VERCEL_PROJECT_PRODUCTION_URL) — sem precisar
// configurar nada. Se o domínio de produção mudar na Vercel, isso acompanha.
const urlDoSite =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const tituloCompartilhamento = "O Peregrino — apoio a quem caminha até Aparecida";
const descricaoCompartilhamento =
  "Gratuito. Pontos de apoio no mapa, rotas, alertas de risco e botão de emergência para quem caminha pela Via Dutra até o Santuário de Aparecida. Abre direto no navegador — não precisa baixar nada da loja.";

export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite),
  title: "O Peregrino — Rodovia Dutra até Aparecida",
  description:
    "App de apoio para peregrinos que caminham pela Rodovia Presidente Dutra até Aparecida-SP: pontos de apoio, rotas seguras, localização e emergência.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "O Peregrino",
    title: tituloCompartilhamento,
    description: descricaoCompartilhamento,
  },
  twitter: {
    card: "summary_large_image",
    title: tituloCompartilhamento,
    description: descricaoCompartilhamento,
  },
  manifest: "/manifest.json",
  // Rodada 50 — no iPhone, o ícone adicionado à tela inicial abre em tela
  // cheia, como app, com este nome embaixo do ícone.
  appleWebApp: {
    capable: true,
    title: "O Peregrino",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#8f3f19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Deixa o app desenhar por baixo do notch/barra de gestos do iPhone, para
  // que o cabeçalho e o menu inferior possam aplicar o preenchimento seguro
  // (env(safe-area-inset-*)) em vez de ficarem cobertos pela interface do
  // sistema.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Rodada 50 — guarda o aviso "pode instalar" do Android assim que a
            página abre (ver src/lib/instalar-app.ts) e registra o service
            worker que torna o site instalável. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_CAPTURA_INSTALACAO }} />
        {/* Aplica o tema salvo antes da primeira pintura, evitando flash de tela clara/escura errada. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tema');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <AuthRoleProvider>
          <TermosGate />
          <CompletarCadastroGate />
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 pt-6" style={{ paddingBottom: "calc(5.5rem + var(--safe-bottom))" }}>
            {children}
          </main>
          <EmergencyButton />
          <BottomNav />
        </AuthRoleProvider>
        <LocationSharingManager />
        <RegistrarAcesso />
      </body>
    </html>
  );
}
