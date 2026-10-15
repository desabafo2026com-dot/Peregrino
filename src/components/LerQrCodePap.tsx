"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, Loader2, ScanLine, X } from "lucide-react";

// Rodada 73 — leitor de QR code dentro do app. Abrir o QR do PAP pela
// câmera do sistema nem sempre abre o app instalado (no iPhone nunca abre:
// vai para o Safari, que tem outro login). Lendo por aqui, o carimbo entra
// direto, já logado.
// Usa o leitor nativo do navegador (BarcodeDetector, Chrome/Android) e, onde
// ele não existe (iPhone), a biblioteca gratuita jsQR. Sem câmera ao vivo,
// dá para tirar uma foto do QR.

type DetectorNativo = { detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]> };

// Aceita o link completo (https://.../carimbo/ABCD2345) ou só o código.
export function tokenDoQr(texto: string): string | null {
  const t = texto.trim();
  const doLink = t.match(/\/carimbo\/([A-Za-z0-9]{4,16})(?:[/?#]|$)/);
  if (doLink) return doLink[1].toUpperCase();
  if (/^[A-Za-z0-9]{6,12}$/.test(t)) return t.toUpperCase();
  return null;
}

async function criarDetectorNativo(): Promise<DetectorNativo | null> {
  const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): DetectorNativo; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (!BD) return null;
  try {
    const formatos = (await BD.getSupportedFormats?.()) ?? ["qr_code"];
    if (!formatos.includes("qr_code")) return null;
    return new BD({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

async function lerComJsQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { default: jsQR } = await import("jsqr");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

export default function LerQrCodePap() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<"iniciando" | "lendo" | "sem_camera" | "lido">("iniciando");
  const [aviso, setAviso] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const parar = useCallback(() => {
    if (loopRef.current) window.clearTimeout(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const fechar = useCallback(() => {
    parar();
    setAberto(false);
  }, [parar]);

  const tratarTexto = useCallback(
    (texto: string | null) => {
      if (!texto) return false;
      const token = tokenDoQr(texto);
      if (!token) {
        setAviso("Este QR code não é de um Ponto de Apoio do O Peregrino.");
        return false;
      }
      setEstado("lido");
      parar();
      router.push(`/carimbo/${token}`);
      return true;
    },
    [parar, router]
  );

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("sem_camera");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        setEstado("lendo");
        const nativo = await criarDetectorNativo();
        const canvas = (canvasRef.current ??= document.createElement("canvas"));
        const passo = async () => {
          if (cancelado || !streamRef.current) return;
          let texto: string | null = null;
          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              if (nativo) {
                const r = await nativo.detect(video);
                texto = r[0]?.rawValue ?? null;
              } else {
                const escala = Math.min(1, 640 / video.videoWidth);
                canvas.width = Math.round(video.videoWidth * escala);
                canvas.height = Math.round(video.videoHeight * escala);
                canvas.getContext("2d", { willReadFrequently: true })?.drawImage(video, 0, 0, canvas.width, canvas.height);
                texto = await lerComJsQr(canvas);
              }
            }
          } catch {
            texto = null;
          }
          if (texto && tratarTexto(texto)) return;
          loopRef.current = window.setTimeout(passo, 250);
        };
        passo();
      } catch {
        if (!cancelado) setEstado("sem_camera");
      }
    })();
    return () => {
      cancelado = true;
      parar();
    };
  }, [aberto, parar, tratarTexto]);

  async function lerFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setAviso(null);
    try {
      const bitmap = await createImageBitmap(arquivo);
      const escala = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      canvas.getContext("2d", { willReadFrequently: true })?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const nativo = await criarDetectorNativo();
      const texto = nativo ? ((await nativo.detect(canvas))[0]?.rawValue ?? null) : await lerComJsQr(canvas);
      if (!texto) setAviso("Não encontrei um QR code na foto. Tente de novo, mais perto e com o QR inteiro na imagem.");
      else tratarTexto(texto);
    } catch {
      setAviso("Não consegui abrir a foto. Tente de novo.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEstado("iniciando");
          setAviso(null);
          setAberto(true);
        }}
        className="btn-primary flex w-full items-center justify-center gap-2"
      >
        <ScanLine size={18} /> Ler QR code do PAP (abrir câmera)
      </button>
      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white" role="dialog" aria-label="Ler QR code do PAP">
            <div className="flex items-center gap-2 p-3">
              <Camera size={20} />
              <span className="font-bold">Aponte para o QR code do PAP</span>
              <button type="button" onClick={fechar} className="ml-auto rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
                <X size={22} />
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              {estado === "lendo" && (
                <div className="pointer-events-none absolute aspect-square w-[70%] max-w-xs rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              )}
              {(estado === "iniciando" || estado === "lido") && (
                <div className="absolute flex items-center gap-2 text-sm">
                  <Loader2 size={18} className="animate-spin" /> {estado === "lido" ? "Abrindo o carimbo..." : "Abrindo a câmera..."}
                </div>
              )}
              {estado === "sem_camera" && (
                <p className="absolute max-w-xs px-4 text-sm" style={{ textAlign: "center" }}>
                  Não foi possível abrir a câmera aqui (permissão negada ou aparelho sem suporte). Tire uma foto do QR code
                  pelo botão abaixo.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 p-4">
              {aviso && (
                <p className="rounded-lg bg-amber-500/20 p-2 text-sm text-amber-100" style={{ textAlign: "center" }}>
                  {aviso}
                </p>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/40 p-3 text-sm font-semibold">
                <ImageUp size={18} /> Tirar foto do QR code
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    lerFoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
