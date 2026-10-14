"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { FileText } from "lucide-react";
import { BR_LABELS, SENTIDO_PISTA_LABELS, TIPO_COMERCIO_LABELS } from "@/lib/constants";
import type { PontoComercial } from "@/types/database";

export default function ComercioQrCode({ comercio, url }: { comercio: PontoComercial; url: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#1f3b6b" } }).then(setQr);
  }, [url]);

  const local = [
    comercio.cidade,
    [BR_LABELS[comercio.br] ?? comercio.br, comercio.km_referencia != null ? `km ${comercio.km_referencia}` : null]
      .filter(Boolean)
      .join(" "),
    comercio.sentido_pista ? SENTIDO_PISTA_LABELS[comercio.sentido_pista] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function baixarPdf() {
    setGerando(true);
    setErro(null);
    try {
      const { gerarPdfCartazesQr } = await import("@/lib/pdf-cartaz-qr");
      const cartaz = {
        url,
        rotulo: TIPO_COMERCIO_LABELS[comercio.tipo] ?? "Hotel / restaurante",
        nome: comercio.nome,
        local,
        chamada: "Peregrino, aponte a câmera do celular:",
        texto: "veja as informações deste estabelecimento e de todo o caminho até Aparecida no app O Peregrino.",
      };
      await gerarPdfCartazesQr([cartaz, cartaz], `qrcode-${comercio.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="card flex w-full flex-col items-center gap-2 text-center">
        <p className="font-bold" style={{ textAlign: "center" }}>
          {comercio.nome}
        </p>
        <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
          {local}
        </p>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code" className="w-56" />
        )}
      </div>
      <button type="button" onClick={baixarPdf} disabled={gerando || !qr} className="btn-primary flex items-center gap-2">
        <FileText size={16} /> {gerando ? "Gerando..." : "Baixar cartaz (PDF, 2 por folha A4)"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
