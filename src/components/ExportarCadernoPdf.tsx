"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { DadosCarimbo } from "@/lib/carimbo-svg";
import type { CapaCaderno } from "@/lib/caderno-pdf";

// Rodada 71 — baixar o caderno de bordo em PDF para guardar ou imprimir.
export default function ExportarCadernoPdf({ carimbos, capa }: { carimbos: DadosCarimbo[]; capa: CapaCaderno }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function exportar() {
    setGerando(true);
    setErro(null);
    try {
      const { exportarCadernoPdf } = await import("@/lib/caderno-pdf");
      await exportarCadernoPdf(carimbos, capa);
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={exportar} disabled={gerando} className="btn-primary flex w-full items-center justify-center gap-2">
        <FileDown size={18} /> {gerando ? "Gerando o PDF..." : "Baixar caderno em PDF (para imprimir)"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
