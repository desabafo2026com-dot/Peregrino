import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import EmergencyButton from "@/components/EmergencyButton";
import LocationSharingManager from "@/components/LocationSharingManager";
import { AuthRoleProvider } from "@/components/AuthRoleProvider";
import TermosGate from "@/components/TermosGate";

export const metadata: Metadata = {
  title: "O Peregrino — Rodovia Dutra até Aparecida",
  description:
    "App de apoio para peregrinos que caminham pela Rodovia Presidente Dutra até Aparecida-SP: pontos de apoio, rotas seguras, localização e emergência.",
  manifest: "/manifest.json",
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
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 pt-6" style={{ paddingBottom: "calc(5.5rem + var(--safe-bottom))" }}>
            {children}
          </main>
          <EmergencyButton />
          <BottomNav />
        </AuthRoleProvider>
        <LocationSharingManager />
      </body>
    </html>
  );
}
