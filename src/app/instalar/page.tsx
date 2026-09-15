"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import VoltarButton from "@/components/VoltarButton";
import { Share2, Smartphone, Apple, Copy, Check, Download } from "lucide-react";

type SistemaDetectado = "ios" | "android" | "outro";

function detectarSistema(): SistemaDetectado {
  if (typeof navigator === "undefined") return "outro";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "outro";
}

export default function InstalarPage() {
  const [sistema, setSistema] = useState<SistemaDetectado>("outro");
  const [url, setUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [jaInstalado, setJaInstalado] = useState(false);

  useEffect(() => {
    // Detecção de sistema/URL só é possível no navegador (window/navigator
    // não existem durante a renderização no servidor) — por isso acontece
    // aqui, no primeiro efeito após montar, e não durante a renderização.
    async function detectar() {
      const origem = window.location.origin;
      setSistema(detectarSistema());
      setUrl(origem);
      setJaInstalado(window.matchMedia("(display-mode: standalone)").matches);
      const dataUrl = await QRCode.toDataURL(origem, {
        width: 220,
        margin: 1,
        color: { dark: "#723618" },
      });
      setQrDataUrl(dataUrl);
    }
    detectar();
  }, []);

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "O Peregrino",
          text: "App de apoio para quem caminha pela Rodovia Dutra até Aparecida-SP",
          url,
        });
      } catch {
        // usuário cancelou o compartilhamento — sem problema
      }
    } else {
      copiarLink();
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível — sem problema, o link já aparece na tela
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-xl font-bold">Compartilhar e instalar o app</h1>
      <p className="mb-6 text-sm text-neutral-500">
        O Peregrino funciona direto do navegador — instalando, ele ganha um
        ícone na tela inicial do seu celular, como um app normal, sem ocupar
        espaço de uma loja de aplicativos.
      </p>

      {jaInstalado && (
        <div className="card mb-5 border-green-200 bg-green-50 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
          <Check className="mr-1 inline" size={16} /> Você já está usando o app instalado. 🎉
        </div>
      )}

      <div className="card mb-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          {sistema === "ios" ? <Apple size={20} /> : <Smartphone size={20} />}
          {sistema === "ios" && "Instalar no iPhone/iPad"}
          {sistema === "android" && "Instalar no Android"}
          {sistema === "outro" && "Instalar no celular"}
        </h2>

        {sistema === "ios" && (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Abra este site no navegador Safari (não funciona pelo Chrome no iPhone).</li>
            <li>
              Toque no ícone de <strong>Compartilhar</strong> (o quadrado com a seta para cima),
              na barra do navegador.
            </li>
            <li>
              Escolha <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
            </li>
            <li>Confirme tocando em &quot;Adicionar&quot;. Pronto — o ícone do app O Peregrino aparece na sua tela.</li>
          </ol>
        )}

        {sistema === "android" && (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Abra este site no Chrome.</li>
            <li>
              Toque no menu <strong>⋮</strong> (três pontinhos, no canto superior direito).
            </li>
            <li>
              Escolha <strong>&quot;Instalar aplicativo&quot;</strong> ou{" "}
              <strong>&quot;Adicionar à tela inicial&quot;</strong>.
            </li>
            <li>Confirme. O Chrome também pode mostrar esse aviso sozinho, na parte de baixo da tela.</li>
          </ol>
        )}

        {sistema === "outro" && (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Abra{" "}
            <a href={url} className="font-semibold text-amber-700">
              {url}
            </a>{" "}
            pelo navegador do seu celular (Safari no iPhone, Chrome no
            Android) para ver o passo a passo de instalação.
          </p>
        )}
      </div>

      <div className="card flex flex-col items-center gap-4 text-center">
        <h2 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          <Share2 size={20} /> Compartilhar com outro peregrino
        </h2>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR code para abrir o app O Peregrino"
            className="rounded-xl border border-neutral-200 dark:border-neutral-800"
            width={220}
            height={220}
          />
        )}
        <p className="text-sm text-neutral-500">
          Aponte a câmera do celular para o QR code, ou use os botões abaixo.
        </p>
        <div className="flex w-full gap-2">
          <button onClick={compartilhar} className="btn-primary flex flex-1 items-center justify-center gap-2">
            <Share2 size={18} /> Compartilhar
          </button>
          <button
            onClick={copiarLink}
            className="btn-secondary flex flex-1 items-center justify-center gap-2"
          >
            {copiado ? <Check size={18} /> : <Copy size={18} />}
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </div>
        {qrDataUrl && (
          <a
            href={qrDataUrl}
            download="peregrino-qrcode.png"
            className="flex items-center gap-1 text-xs font-medium text-amber-700"
          >
            <Download size={14} /> Baixar QR code
          </a>
        )}
      </div>
    </div>
  );
}
