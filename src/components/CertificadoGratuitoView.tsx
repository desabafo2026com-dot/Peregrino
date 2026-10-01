"use client";

import { useRef } from "react";
import Image from "next/image";
import { Award } from "lucide-react";
import { meioNaFrase, nomeNoCertificado, checkinsNoCertificado, tempoNoCertificado } from "@/lib/certificado-texto";
import type { Certificado } from "@/types/database";
import AcoesCertificado from "@/components/AcoesCertificado";

// Tamanho de página A4 paisagem, em mm — mesma orientação/proporção usada
// pelo Certificado Plus (Rodada 16, a pedido do usuário: "o certificado
// simples tem que ser no tamanho A4 e uma formatação típica de
// certificados"), só que sem a imagem de pergaminho (essa é exclusiva de
// quem compra a Romaria Plus).
const A4_LARGURA_MM = 297;
const A4_ALTURA_MM = 210;

function formatarData(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarDataCurta(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Certificado grátis — versão simples (Rodada 15, redesenhado na Rodada 16
// para o formato A4 e uma formatação mais próxima da de um certificado
// impresso de verdade): sem a arte de pergaminho (essa passou a ser
// exclusiva de quem compra a Romaria Plus, como "Certificado Plus"), com
// moldura, nome centralizado em destaque e uma linha de dados objetivos
// (início, término, tempo total e check-ins) — disponível para qualquer
// peregrino que concluiu a caminhada, sem custo. O conteúdo (nome, trajeto,
// período, check-ins, código) é o mesmo do certificado pago — só a
// moldura/arte muda.
export default function CertificadoGratuitoView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);

  // Rodada 58 — texto no formato pedido pelo usuário.
  const meio = meioNaFrase(c.meio_transporte, c.meio_transporte_outro_desc);



  const dados = [
    { label: "Início", valor: formatarDataCurta(c.data_inicio) },
    { label: "Origem", valor: c.origem || "—" },
    { label: "Chegada", valor: formatarDataCurta(c.data_fim) },
    { label: "Tempo", valor: tempoNoCertificado(c.data_inicio, c.data_fim, c.duracao_texto) || "—" },
    { label: "Check-ins", valor: String(checkinsNoCertificado(c.total_checkins)) },
  ];


  return (
    <div>
      <div
        ref={ref}
        id={`cert-gratis-${c.id}`}
        className="mx-auto w-full max-w-4xl bg-white text-neutral-900 dark:bg-white dark:text-neutral-900"
        style={{ aspectRatio: `${A4_LARGURA_MM} / ${A4_ALTURA_MM}`, containerType: "inline-size" }}
      >
        {/* Moldura dupla — referência clássica de certificado impresso, sem
            depender de nenhuma imagem externa. */}
        <div className="flex h-full w-full flex-col border-[3px] border-amber-800 p-[1.4cqw]">
          <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden border border-amber-300 px-[3cqw] py-[2.2cqw] text-center">
            {/* Rodada 60 — desenho de Nossa Senhora Aparecida ao fundo, bem
                claro e desfocado, para não atrapalhar a leitura. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/certificado/santa-fundo.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[54%] w-[52%] -translate-x-1/2 -translate-y-1/2 select-none"
            />
            <div className="relative flex flex-col items-center gap-[0.6cqw]">
              <Image
                src="/icons/logo-emblema.png"
                alt=""
                width={56}
                height={56}
                style={{ width: "4.2cqw", height: "4.2cqw" }}
                className="rounded-full ring-1 ring-amber-300"
              />
              <p
                className="font-semibold uppercase tracking-[0.3em] text-amber-700"
                style={{ fontSize: "1.1cqw" }}
              >
                O Peregrino
              </p>
              <h2
                className="font-serif font-bold uppercase tracking-[0.1em] text-amber-900"
                style={{ fontSize: "2.3cqw" }}
              >
                Certificado de Peregrinação
              </h2>
            </div>

            <div className="relative flex flex-col items-center gap-[0.5cqw]">
              <p className="text-neutral-500" style={{ fontSize: "1.3cqw" }}>
                Certificamos que
              </p>
              <p
                className="border-b-2 border-amber-200 px-[2cqw] pb-[0.4cqw] font-serif font-bold text-neutral-900"
                style={{ fontSize: "3cqw", lineHeight: 1.15 }}
              >
                {nomeNoCertificado(c.nome_peregrino)}
              </p>
              <p
                className="mx-auto max-w-[85%] text-neutral-700"
                style={{ fontSize: "1.45cqw", lineHeight: 1.45, marginTop: "0.6cqw", textAlign: "center" }}
              >
                concluiu com êxito a peregrinação{meio ? ` ${meio}` : ""} até a Basílica de Nossa Senhora
                Aparecida-SP, conforme os dados abaixo.
              </p>
            </div>

            <div
              className="relative flex w-full items-stretch justify-center divide-x divide-amber-200"
              style={{ fontSize: "1.15cqw" }}
            >
              {dados.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-[0.2cqw] px-[1.2cqw]">
                  <span className="uppercase tracking-wide text-neutral-400" style={{ fontSize: "0.85cqw" }}>
                    {d.label}
                  </span>
                  <span className="font-bold text-amber-800">{d.valor}</span>
                </div>
              ))}
            </div>

            <div
              className="relative flex w-full items-center justify-between border-t border-dashed border-amber-200 pt-[0.8cqw] text-neutral-500"
              style={{ fontSize: "1cqw" }}
            >
              <span>Emitido em {formatarData(c.emitido_em)}</span>
              <span className="flex items-center gap-1 font-mono">
                <Award size={14} className="text-amber-600" /> Código: {c.codigo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rodada 60 — baixar/imprimir revistos para o iPhone (AcoesCertificado). */}
      <AcoesCertificado alvo={ref} nomeBase={`certificado-peregrino-${c.codigo}`} pdfLarguraMm={A4_LARGURA_MM} pdfAlturaMm={A4_ALTURA_MM} larguraMinima={1600} />
    </div>
  );
}
