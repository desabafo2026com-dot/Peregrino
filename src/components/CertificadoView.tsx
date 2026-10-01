"use client";

import { useRef } from "react";
import { meioNaFrase, nomeNoCertificado, checkinsNoCertificado, tempoNoCertificado } from "@/lib/certificado-texto";
import type { Certificado } from "@/types/database";
import AcoesCertificado from "@/components/AcoesCertificado";

// Proporção real da imagem-modelo (public/certificado/modelo-certificado.jpg),
// usada para reservar o espaço certo antes da imagem carregar e para
// posicionar o texto sempre na mesma área em branco do pergaminho,
// independente do tamanho da tela.
const MODELO_LARGURA = 1179;
const MODELO_ALTURA = 896;

function formatarData(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CertificadoView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);

  // Rodada 58 — texto no formato pedido pelo usuário: "concluiu com êxito,
  // nesta data, sua peregrinação (meio) até a Basílica..., saindo de
  // (origem) no dia (data), com (x) check-in(s) ... e um tempo total de (tempo)."
  const meio = meioNaFrase(c.meio_transporte, c.meio_transporte_outro_desc);
  const origem = c.origem;
  const dataInicio = formatarData(c.data_inicio);
  const checkins = checkinsNoCertificado(c.total_checkins);
  const tempo = tempoNoCertificado(c.data_inicio, c.data_fim, c.duracao_texto);



  return (
    <div>
      <div
        ref={ref}
        id={`cert-${c.id}`}
        className="relative mx-auto w-full max-w-2xl"
        style={{ aspectRatio: `${MODELO_LARGURA} / ${MODELO_ALTURA}`, containerType: "inline-size" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/certificado/modelo-certificado.jpg"
          alt="Certificado de Peregrinação — Fé e Conquista"
          className="absolute inset-0 h-full w-full object-contain"
          crossOrigin="anonymous"
        />

        <div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{ top: "44%", bottom: "13%", left: "10%", right: "10%" }}
        >
          <p
            className="text-neutral-600"
            style={{ fontSize: "2.3cqw", letterSpacing: "0.05em" }}
          >
            Certificamos que
          </p>
          <p
            className="font-serif font-bold text-neutral-900"
            style={{ fontSize: "4.2cqw", lineHeight: 1.15, margin: "0.4cqw 0 1cqw", letterSpacing: "0.02em" }}
          >
            {nomeNoCertificado(c.nome_peregrino)}
          </p>
          <p
            className="text-justify text-neutral-700"
            style={{ fontSize: "2.1cqw", lineHeight: 1.45, maxWidth: "95%" }}
          >
            concluiu com êxito, nesta data, sua peregrinação{meio ? ` ${meio}` : ""} até a Basílica de
            Nossa Senhora Aparecida-SP
            {origem && (
              <>
                , saindo de <strong>{origem}</strong>
              </>
            )}
            {dataInicio && <> no dia {dataInicio}</>}, com <strong>{checkins}</strong> check-in(s) confirmados
            ao longo da rota
            {tempo && (
              <>
                {" "}e um tempo total de <strong>{tempo}</strong>
              </>
            )}
            .
          </p>
          <div
            className="mt-[1.5cqw] flex w-full items-center justify-between text-neutral-500"
            style={{ fontSize: "1.4cqw" }}
          >
            <span>Emitido em {formatarData(c.emitido_em)}</span>
            <span className="font-mono">Código: {c.codigo}</span>
          </div>
        </div>
      </div>

      {/* Rodada 60 — baixar/imprimir revistos para o iPhone (AcoesCertificado). */}
      <AcoesCertificado alvo={ref} nomeBase={`certificado-plus-${c.codigo}`} pdfLarguraMm={297} pdfAlturaMm={(297 * MODELO_ALTURA) / MODELO_LARGURA} larguraMinima={1600} />
    </div>
  );
}
