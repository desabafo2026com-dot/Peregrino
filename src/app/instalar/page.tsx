"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import VoltarButton from "@/components/VoltarButton";
import BotaoInstalarApp from "@/components/BotaoInstalarApp";
import { Share2, Smartphone, Apple, Copy, Check, Download, FileText, Printer } from "lucide-react";

type SistemaDetectado = "ios" | "android" | "outro";

function detectarSistema(): SistemaDetectado {
  if (typeof navigator === "undefined") return "outro";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "outro";
}

// Rodada 58b — mensagem que acompanha o link ao compartilhar (texto do
// usuário). O link vai junto, e a prévia (imagem + título) aparece em cima.
const MENSAGEM_COMPARTILHAR = `O PEREGRINO - APP de apoio para quem caminha na Dutra até Aparecida

Após entrar no link, clique em Instalar para criar um ícone no seu celular.

Você tem informações sem se cadastrar.
- Responsáveis por Romarias podem informar a quantidade de pessoas para que os PAPs possam se planejar.
- Gerentes de PAPs podem colocar suas informações para receber doações.
- Peregrinos podem se cadastrar e planejar sua Peregrinação.
Crie sua identificação de Peregrino.
Registre a caminhada em tempo real e receba um certificado!
Receba e mande mensagens de ocorrências no trajeto.
Pode adquirir artes de fotos para tornar sua experiência mais incrível (opcional).`;

function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Salva o arquivo: no iPhone pela folha de compartilhar ("Salvar Imagem" /
// "Salvar em Arquivos"); nos outros, download normal.
async function salvarArquivo(blob: Blob, nome: string) {
  if (ehIOS()) {
    const arquivo = new File([blob], nome, { type: blob.type });
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo] });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    window.open(URL.createObjectURL(blob), "_blank");
    return;
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30000);
}

export default function InstalarPage() {
  const [sistema, setSistema] = useState<SistemaDetectado>("outro");
  const [url, setUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [jaInstalado, setJaInstalado] = useState(false);
  const [cartazPreview, setCartazPreview] = useState<string | null>(null);
  const [gerandoCartaz, setGerandoCartaz] = useState<null | "pdf" | "png">(null);
  const [erroCartaz, setErroCartaz] = useState<string | null>(null);

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
      // Prévia do cartaz para imprimir (Rodada 60).
      try {
        const { gerarCartazQrCode } = await import("@/lib/cartaz-qrcode");
        const cartaz = await gerarCartazQrCode(origem);
        const mini = document.createElement("canvas");
        mini.width = 496;
        mini.height = Math.round((496 * cartaz.height) / cartaz.width);
        mini.getContext("2d")?.drawImage(cartaz, 0, 0, mini.width, mini.height);
        setCartazPreview(mini.toDataURL("image/jpeg", 0.85));
      } catch {
        // sem prévia; os botões continuam funcionando
      }
    }
    detectar();
  }, []);

  async function baixarCartaz(formato: "pdf" | "png") {
    setErroCartaz(null);
    setGerandoCartaz(formato);
    try {
      const { gerarCartazQrCode, canvasParaBlob, CARTAZ_LARGURA, CARTAZ_ALTURA } = await import("@/lib/cartaz-qrcode");
      const cartaz = await gerarCartazQrCode(url || window.location.origin);
      if (formato === "png") {
        await salvarArquivo(await canvasParaBlob(cartaz), "cartaz-o-peregrino.png");
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const jpg = cartaz.toDataURL("image/jpeg", 0.92);
        pdf.addImage(jpg, "JPEG", 0, 0, 210, (210 * CARTAZ_ALTURA) / CARTAZ_LARGURA);
        await salvarArquivo(pdf.output("blob"), "cartaz-o-peregrino.pdf");
      }
    } catch {
      setErroCartaz("Não foi possível gerar o cartaz agora. Tente novamente.");
    } finally {
      setGerandoCartaz(null);
    }
  }

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "O Peregrino",
          text: MENSAGEM_COMPARTILHAR,
          url,
        });
      } catch {
        // usuário cancelou o compartilhamento — sem problema
      }
    } else {
      copiarLink();
    }
  }

  // Rodada 58b — copia a mensagem completa com o link no final (bom para
  // colar em grupos de WhatsApp pelo computador).
  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${MENSAGEM_COMPARTILHAR}\n\n${url}`);
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

      {!jaInstalado && (
        <BotaoInstalarApp className="btn-primary mb-5 flex w-full items-center justify-center gap-2 py-3 text-base">
          <Smartphone size={20} /> Instalar agora
        </BotaoInstalarApp>
      )}

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
            {copiado ? "Copiado!" : "Copiar mensagem"}
          </button>
        </div>
        {qrDataUrl && (
          <a
            href={qrDataUrl}
            download="peregrino-qrcode.png"
            className="flex items-center gap-1 text-xs font-medium text-amber-700"
          >
            <Download size={14} /> Baixar só o QR code
          </a>
        )}
      </div>

      {/* Rodada 60 — cartaz completo para imprimir e colar nos pontos do caminho. */}
      <div className="card flex flex-col items-center gap-4 text-center">
        <h2 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          <Printer size={20} /> Cartaz para imprimir
        </h2>
        <p className="text-sm text-neutral-500" style={{ textAlign: "center" }}>
          Folha A4 com o nome do app, o QR code e o que o peregrino ganha com ele. Imprima e cole em PAPs,
          paróquias, comércios e pontos do caminho.
        </p>
        {cartazPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cartazPreview}
            alt="Prévia do cartaz do app O Peregrino com QR code"
            className="w-48 rounded-lg border border-neutral-200 shadow-md dark:border-neutral-800"
          />
        ) : (
          <div className="flex aspect-[210/297] w-48 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
            preparando prévia...
          </div>
        )}
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            onClick={() => baixarCartaz("pdf")}
            disabled={gerandoCartaz !== null}
            className="btn-primary flex flex-1 items-center justify-center gap-2"
          >
            <FileText size={18} /> {gerandoCartaz === "pdf" ? "Gerando PDF..." : "Baixar cartaz (PDF)"}
          </button>
          <button
            onClick={() => baixarCartaz("png")}
            disabled={gerandoCartaz !== null}
            className="btn-secondary flex flex-1 items-center justify-center gap-2"
          >
            <Download size={18} /> {gerandoCartaz === "png" ? "Gerando imagem..." : "Baixar como imagem"}
          </button>
        </div>
        {erroCartaz && <p className="text-xs text-red-600">{erroCartaz}</p>}
      </div>
    </div>
  );
}
