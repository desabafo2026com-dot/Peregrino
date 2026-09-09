"use client";

import Image from "next/image";
import { Printer } from "lucide-react";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import type { Certificado } from "@/types/database";

function formatarData(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CertificadoView({ certificado: c }: { certificado: Certificado }) {
  const meioLabel =
    c.meio_transporte === "outros"
      ? c.meio_transporte_outro_desc || "outro meio de transporte"
      : c.meio_transporte
        ? MEIO_TRANSPORTE_LABELS[c.meio_transporte]
        : "a pé";
  return (
    <div>
      <div
        id={`cert-${c.id}`}
        className="mx-auto max-w-2xl rounded-2xl border-8 border-double border-amber-800 bg-[#fffdf7] p-10 text-center text-neutral-800 shadow-sm print:border-4"
      >
        <div className="mb-4 flex justify-center">
          <Image
            src="/certificado/selo.png"
            alt="Selo da Basílica de Aparecida"
            width={90}
            height={90}
            className="rounded-full"
          />
        </div>
        <p className="mb-1 text-xs tracking-[0.3em] text-amber-700 uppercase">
          Certificado de Peregrinação
        </p>
        <h2 className="mb-6 font-serif text-2xl font-bold text-amber-900">
          Rodovia Presidente Dutra — Aparecida-SP
        </h2>

        <p className="mb-2 text-sm text-neutral-600">Certificamos que</p>
        <p className="mb-4 font-serif text-3xl font-bold text-neutral-900">
          {c.nome_peregrino}
        </p>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-neutral-600">
          concluiu {meioLabel} sua peregrinação até a Basílica de Nossa
          Senhora Aparecida{c.rota_nome ? ` pela ${c.rota_nome}` : ""},
          percorrendo o trajeto em{" "}
          <strong>{c.duracao_texto ?? `${c.dias_caminhada ?? "-"} dia(s)`}</strong>,
          entre <strong>{formatarData(c.data_inicio)}</strong> e{" "}
          <strong>{formatarData(c.data_fim)}</strong>, com{" "}
          <strong>{c.total_checkins}</strong> check-in(s) confirmados ao
          longo da rota.
        </p>

        <div className="mt-8 flex items-center justify-between border-t border-amber-200 pt-4 text-xs text-neutral-500">
          <span>Emitido em {formatarData(c.emitido_em)}</span>
          <span className="font-mono">Código: {c.codigo}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-center print:hidden">
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-2"
        >
          <Printer size={16} /> Imprimir / salvar em PDF
        </button>
      </div>
    </div>
  );
}
