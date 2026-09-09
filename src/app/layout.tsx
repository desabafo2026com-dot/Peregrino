import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import EmergencyButton from "@/components/EmergencyButton";

export const metadata: Metadata = {
  title: "Peregrino — Rodovia Dutra até Aparecida",
  description:
    "App de apoio para peregrinos que caminham pela Rodovia Presidente Dutra até Aparecida-SP: pontos de apoio, rotas seguras, localização e emergência.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#92400e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</main>
        <EmergencyButton />
      </body>
    </html>
  );
}
