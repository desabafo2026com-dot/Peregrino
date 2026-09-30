"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Smartphone, X, Share, SquarePlus, Check, Copy, EllipsisVertical, MoreHorizontal } from "lucide-react";
import { useInstalarApp, detectarAparelho, type SistemaAparelho, type NavegadorAparelho } from "@/lib/instalar-app";

// Rodada 50 — botão "Instalar no telefone" que instala de verdade quando o
// aparelho deixa (Android: abre a janela oficial de instalação e o ícone é
// criado na hora) e, quando não deixa (iPhone, ou navegador de dentro do
// Instagram/Facebook), abre um passo a passo curto na própria tela, em vez
// de mandar para outra página.
export default function BotaoInstalarApp({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { podeInstalarDireto, jaInstalado, instalar } = useInstalarApp();
  const [guia, setGuia] = useState<null | { sistema: SistemaAparelho; navegador: NavegadorAparelho }>(null);
  const [mensagem, setMensagem] = useState<null | "instalado" | "ja-instalado">(null);

  async function aoTocar() {
    if (jaInstalado) {
      setMensagem("ja-instalado");
      return;
    }
    if (podeInstalarDireto) {
      const resultado = await instalar();
      if (resultado === "instalado") {
        setMensagem("instalado");
        return;
      }
      if (resultado === "recusado") return;
    }
    setGuia(detectarAparelho());
  }

  return (
    <>
      <button type="button" onClick={aoTocar} className={className}>
        {children ?? (
          <>
            <Smartphone size={18} /> Instalar no telefone
          </>
        )}
      </button>

      {mensagem &&
        createPortal(
          <Janela onFechar={() => setMensagem(null)}>
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                <Check size={26} />
              </span>
              <p className="font-bold" style={{ textAlign: "center" }}>
                {mensagem === "instalado" ? "Pronto! App instalado." : "O app já está instalado neste celular."}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
                {mensagem === "instalado"
                  ? "O ícone do O Peregrino foi criado na tela inicial do seu celular. É só tocar nele para abrir."
                  : "Procure o ícone do O Peregrino na tela inicial para abrir direto."}
              </p>
              <button type="button" onClick={() => setMensagem(null)} className="btn-primary mt-2 w-full">
                Ok
              </button>
            </div>
          </Janela>,
          document.body
        )}

      {guia &&
        createPortal(
          <Janela onFechar={() => setGuia(null)}>
            <GuiaInstalacao sistema={guia.sistema} navegador={guia.navegador} />
          </Janela>,
          document.body
        )}
    </>
  );
}

function Janela({ onFechar, children }: { onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onClick={onFechar}>
      <div
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onFechar} aria-label="Fechar" className="absolute top-3 right-3 text-neutral-500">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Passo({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-700 text-sm font-bold text-white">
        {numero}
      </span>
      <div className="pt-0.5 text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
        {children}
      </div>
    </li>
  );
}

function Destaque({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 align-middle font-semibold dark:border-neutral-700 dark:bg-neutral-800">
      {children}
    </span>
  );
}

function GuiaInstalacao({ sistema, navegador }: { sistema: SistemaAparelho; navegador: NavegadorAparelho }) {
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem acesso à área de transferência — o endereço aparece na tela
    }
  }

  const cabecalho = (
    <div className="flex items-center gap-3 border-b border-neutral-200 p-5 pr-10 dark:border-neutral-800">
      <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
      <div>
        <p className="font-bold">Instalar o O Peregrino</p>
        <p className="text-xs text-neutral-500">Leva menos de 1 minuto e não ocupa espaço.</p>
      </div>
    </div>
  );

  const botaoCopiar = (
    <button type="button" onClick={copiarLink} className="btn-secondary flex w-full items-center justify-center gap-2 text-sm">
      {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Link copiado!" : "Copiar o link do app"}
    </button>
  );

  if (navegador === "app-interno") {
    return (
      <>
        {cabecalho}
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
            Você abriu o link por dentro de outro app (Instagram, Facebook...), e por aqui não dá para
            instalar. Abra no navegador do celular:
          </p>
          <ol className="flex flex-col gap-3">
            <Passo numero={1}>
              Toque nos <Destaque><MoreHorizontal size={14} /> três pontinhos</Destaque> no canto da tela.
            </Passo>
            <Passo numero={2}>
              Escolha <strong>&quot;Abrir no navegador&quot;</strong> (ou &quot;Abrir no Chrome&quot; / &quot;Abrir no Safari&quot;).
            </Passo>
            <Passo numero={3}>Lá, toque de novo em <strong>Instalar no telefone</strong>.</Passo>
          </ol>
          {botaoCopiar}
        </div>
      </>
    );
  }

  if (sistema === "ios" && navegador === "outro-ios") {
    return (
      <>
        {cabecalho}
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
            No iPhone, só o <strong>Safari</strong> consegue colocar o app na tela inicial (é uma regra da Apple).
          </p>
          <ol className="flex flex-col gap-3">
            <Passo numero={1}>Copie o link abaixo.</Passo>
            <Passo numero={2}>Abra o <strong>Safari</strong> e cole o link na barra de endereço.</Passo>
            <Passo numero={3}>Toque em <strong>Instalar no telefone</strong> de novo, já no Safari.</Passo>
          </ol>
          {botaoCopiar}
        </div>
      </>
    );
  }

  if (sistema === "ios") {
    return (
      <>
        {cabecalho}
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
            No iPhone a Apple não deixa o site instalar sozinho, mas são só 3 toques:
          </p>
          <ol className="flex flex-col gap-3">
            <Passo numero={1}>
              Toque em <Destaque><Share size={14} /> Compartilhar</Destaque> — o quadrado com a seta para cima, na
              barra do Safari (embaixo ou em cima da tela). Se não aparecer, toque antes nos{" "}
              <Destaque><MoreHorizontal size={14} /></Destaque>.
            </Passo>
            <Passo numero={2}>
              Role a lista para baixo e toque em <Destaque><SquarePlus size={14} /> Adicionar à Tela de Início</Destaque>.
            </Passo>
            <Passo numero={3}>
              Toque em <strong>Adicionar</strong>, no canto de cima. Pronto: o ícone do O Peregrino aparece na
              tela inicial.
            </Passo>
          </ol>
          <div className="flex animate-bounce justify-center pt-1 text-amber-700 dark:text-amber-500">
            <Share size={26} />
          </div>
        </div>
      </>
    );
  }

  if (sistema === "android") {
    return (
      <>
        {cabecalho}
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
            Este navegador não abriu a instalação automática. Faça assim:
          </p>
          <ol className="flex flex-col gap-3">
            <Passo numero={1}>
              Toque no menu <Destaque><EllipsisVertical size={14} /></Destaque> (três pontinhos, no canto de cima).
            </Passo>
            <Passo numero={2}>
              Escolha <strong>&quot;Instalar app&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
            </Passo>
            <Passo numero={3}>Confirme em <strong>Instalar</strong>. O ícone aparece na tela inicial.</Passo>
          </ol>
          <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
            Dica: no <strong>Chrome</strong> a instalação costuma abrir direto ao tocar no botão.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {cabecalho}
      <div className="flex flex-col gap-4 p-5">
        <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
          Para instalar no celular, abra este mesmo endereço no navegador do telefone (Chrome no Android, Safari no
          iPhone) e toque em <strong>Instalar no telefone</strong>. A página{" "}
          <a href="/instalar" className="font-semibold text-amber-700 underline">
            Instalar
          </a>{" "}
          tem um QR code para abrir direto no celular.
        </p>
        {botaoCopiar}
      </div>
    </>
  );
}
