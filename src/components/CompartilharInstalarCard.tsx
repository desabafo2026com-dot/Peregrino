"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Share2 } from "lucide-react";

// Mostra o QR code já pronto direto na home (sem precisar entrar em /instalar
// para ver algo) — o cartão inteiro continua levando para /instalar, que tem
// o passo a passo completo, compartilhar e baixar o QR code em tamanho maior.
export default function CompartilharInstalarCard() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function gerar() {
      const origem = window.location.origin;
      const dataUrl = await QRCode.toDataURL(origem, {
        width: 96,
        margin: 1,
        color: { dark: "#723618" },
      });
      setQrDataUrl(dataUrl);
    }
    gerar();
  }, []);

  return (
    <Link href="/instalar" className="card flex items-center gap-4 transition hover:border-amber-300">
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="QR code para abrir o Peregrino"
          width={72}
          height={72}
          className="shrink-0 rounded-lg border border-neutral-200 dark:border-neutral-800"
        />
      ) : (
        <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      )}
      <div>
        <h2 className="mb-1 flex items-center gap-2 font-bold">
          <Share2 size={18} className="text-amber-700" /> Compartilhar ou instalar o app
        </h2>
        <p className="text-sm text-neutral-500">
          Aponte a câmera para o QR code, ou toque aqui para ver o passo a
          passo de instalação e compartilhar com outro peregrino.
        </p>
      </div>
    </Link>
  );
}
