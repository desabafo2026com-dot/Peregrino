"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { intervalToDuration } from "date-fns";
import {
  Download,
  Share2,
  Camera,
  Images,
  RefreshCw,
  Church,
  Clock,
  CalendarDays,
} from "lucide-react";
import type { Certificado } from "@/types/database";

// Formato vertical (9:16) — o mesmo formato do Instagram Stories e do
// WhatsApp Status, priorizado conforme especificação da Romaria Plus.
// Estrutura preparada para no futuro oferecer outros formatos (quadrado,
// horizontal) sem alterar o restante do componente.
const ARTE_LARGURA = 1080;
const ARTE_ALTURA = 1920;

type Modelo = "classico" | "destaque";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatarDataCurta(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Dia único ("15/09/2026") ou período ("15 a 17/09/2026") — sempre a partir
// dos dados reais já registrados na peregrinação, nunca digitado pelo usuário.
function formatarPeriodo(inicio: string | null, fim: string | null) {
  const dIni = inicio ? new Date(inicio) : null;
  const dFim = fim ? new Date(fim) : null;
  if (dIni && dFim) {
    if (dIni.toDateString() === dFim.toDateString()) return formatarDataCurta(dIni);
    const mesmoMesAno = dIni.getMonth() === dFim.getMonth() && dIni.getFullYear() === dFim.getFullYear();
    return mesmoMesAno
      ? `${pad2(dIni.getDate())} a ${formatarDataCurta(dFim)}`
      : `${formatarDataCurta(dIni)} a ${formatarDataCurta(dFim)}`;
  }
  const unica = dIni ?? dFim;
  return unica ? formatarDataCurta(unica) : null;
}

// Tempo compacto ("06h32min" ou "3d 06h32min"), calculado a partir das datas
// reais de início/fim registradas — nunca do texto verboso já usado em
// outras telas ("3 dias 5 horas e 20 minutos").
function formatarTempoCompacto(inicio: string | null, fim: string | null) {
  if (!inicio || !fim) return null;
  const duracao = intervalToDuration({ start: new Date(inicio), end: new Date(fim) });
  const dias = duracao.days ?? 0;
  const horas = pad2(duracao.hours ?? 0);
  const minutos = pad2(duracao.minutes ?? 0);
  return dias > 0 ? `${dias}d ${horas}h${minutos}min` : `${horas}h${minutos}min`;
}

const MODELOS: { id: Modelo; nome: string }[] = [
  { id: "classico", nome: "Clássico" },
  { id: "destaque", nome: "Foto em destaque" },
];

export default function RomariaPlusView({ certificado: c }: { certificado: Certificado }) {
  const ref = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [modelo, setModelo] = useState<Modelo>("classico");
  const [gerando, setGerando] = useState<"baixar" | "compartilhar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Libera o object URL da foto ao trocar ou sair da tela, para não vazar
  // memória — cada foto escolhida cria um URL novo.
  useEffect(() => {
    return () => {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    };
  }, [fotoUrl]);

  // Só o ano vem do sistema: nunca é digitado nem fixado no código. Igual à
  // regra já usada no certificado — sempre a data real de conclusão.
  const ano = new Date(c.data_fim ?? c.emitido_em).getFullYear();
  const periodo = formatarPeriodo(c.data_inicio, c.data_fim);
  const tempo = formatarTempoCompacto(c.data_inicio, c.data_fim) ?? c.duracao_texto;

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setFotoUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(arquivo);
    });
  }

  function trocarFoto() {
    setFotoUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  async function gerarPng(): Promise<string | null> {
    if (!ref.current) return null;
    const { toPng } = await import("html-to-image");
    return toPng(ref.current, { pixelRatio: 2 });
  }

  async function baixar() {
    setErro(null);
    setGerando("baixar");
    try {
      const dataUrl = await gerarPng();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `romaria-plus-${c.codigo}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setErro("Não foi possível gerar a arte agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  async function compartilhar() {
    setErro(null);
    setGerando("compartilhar");
    try {
      const dataUrl = await gerarPng();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `romaria-plus-${c.codigo}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Romaria para Aparecida",
          text: "Minha peregrinação até Aparecida-SP!",
        });
      } else {
        const link = document.createElement("a");
        link.download = file.name;
        link.href = dataUrl;
        link.click();
      }
    } catch {
      // Cancelado pelo usuário ou sem suporte — sem problema.
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={selecionarFoto}
      />
      <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={selecionarFoto} />

      {!fotoUrl ? (
        <div className="card flex flex-col items-center gap-3 text-center">
          <Image
            src="/icons/logo-emblema.png"
            alt=""
            width={64}
            height={64}
            className="h-14 w-14 rounded-xl ring-2 ring-amber-200"
          />
          <h3 className="font-bold text-amber-800 dark:text-amber-500">
            Sua Arte Personalizada da Romaria
          </h3>
          <p className="text-sm text-neutral-500">
            Escolha uma foto sua para criar uma arte pronta para compartilhar nas redes
            sociais, no WhatsApp Status ou guardar no celular.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              className="btn-primary flex items-center gap-2"
            >
              <Camera size={16} /> Tirar foto
            </button>
            <button
              onClick={() => galeriaRef.current?.click()}
              className="btn-secondary flex items-center gap-2"
            >
              <Images size={16} /> Escolher da galeria
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {MODELOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelo(m.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  modelo === m.id
                    ? "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                }`}
              >
                {m.nome}
              </button>
            ))}
          </div>

          <div
            ref={ref}
            className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-lg"
            style={{ aspectRatio: `${ARTE_LARGURA} / ${ARTE_ALTURA}`, containerType: "inline-size" }}
          >
            {modelo === "classico" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 pt-[5%] text-white">
                  <Image
                    src="/icons/logo-emblema.png"
                    alt=""
                    width={64}
                    height={64}
                    style={{ width: "9%", height: "auto" }}
                    className="rounded-lg ring-1 ring-white/40"
                  />
                  <span className="font-semibold tracking-[0.15em]" style={{ fontSize: "2.6cqw" }}>
                    O PEREGRINO
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-[3%] px-[7%] pb-[7%] text-center text-white">
                  <p className="font-serif font-bold" style={{ fontSize: "6.8cqw", lineHeight: 1.1 }}>
                    ROMARIA PARA APARECIDA
                  </p>
                  <p className="font-bold text-stripe-400" style={{ fontSize: "9cqw" }}>
                    {ano}
                  </p>
                  <div
                    className="flex w-full items-center justify-center gap-[6%] rounded-xl bg-black/40 py-[3%] backdrop-blur-sm"
                    style={{ fontSize: "3.4cqw" }}
                  >
                    {periodo && (
                      <span className="flex items-center gap-1">
                        <CalendarDays size={16} className="shrink-0" /> {periodo}
                      </span>
                    )}
                    {tempo && (
                      <span className="flex items-center gap-1">
                        <Clock size={16} className="shrink-0" /> {tempo}
                      </span>
                    )}
                  </div>
                  <div className="mt-[2%] flex w-full items-center justify-center gap-[10%]">
                    <Image
                      src="/icons/logo-emblema.png"
                      alt="Símbolo do app"
                      width={64}
                      height={64}
                      style={{ width: "10%", height: "auto" }}
                      className="rounded-lg"
                    />
                    <Church size={22} style={{ width: "8cqw", height: "8cqw" }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center bg-gradient-to-br from-amber-800 via-amber-900 to-neutral-900 px-[7%] pt-[8%] pb-[6%] text-center text-white">
                <div className="absolute inset-x-0 top-0 h-[2.2%] bg-stripe-400" />
                <p className="font-serif font-bold" style={{ fontSize: "6.4cqw", lineHeight: 1.15 }}>
                  ROMARIA PARA APARECIDA
                </p>
                <p className="mb-[4%] font-bold text-stripe-400" style={{ fontSize: "8cqw" }}>
                  {ano}
                </p>
                <div className="relative w-[78%] overflow-hidden rounded-2xl ring-4 ring-white/30" style={{ aspectRatio: "1 / 1" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div
                  className="mt-[6%] flex w-full flex-col gap-[3%] rounded-xl bg-white/10 py-[4%] backdrop-blur-sm"
                  style={{ fontSize: "3.4cqw" }}
                >
                  <div className="flex items-center justify-center gap-[6%]">
                    {periodo && (
                      <span className="flex items-center gap-1">
                        <CalendarDays size={16} className="shrink-0" /> {periodo}
                      </span>
                    )}
                    {tempo && (
                      <span className="flex items-center gap-1">
                        <Clock size={16} className="shrink-0" /> {tempo}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex w-full items-center justify-center gap-[10%] pt-[6%]">
                  <Image
                    src="/icons/logo-emblema.png"
                    alt="Símbolo do app"
                    width={64}
                    height={64}
                    style={{ width: "10%", height: "auto" }}
                    className="rounded-lg"
                  />
                  <Church size={22} style={{ width: "8cqw", height: "8cqw" }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={compartilhar}
                disabled={gerando !== null}
                className="btn-primary flex items-center gap-2"
              >
                <Share2 size={16} /> {gerando === "compartilhar" ? "Gerando..." : "Compartilhar"}
              </button>
              <button
                onClick={baixar}
                disabled={gerando !== null}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={16} /> {gerando === "baixar" ? "Gerando..." : "Baixar imagem"}
              </button>
              <button
                onClick={trocarFoto}
                disabled={gerando !== null}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw size={16} /> Trocar foto
              </button>
            </div>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
          </div>
        </>
      )}
    </div>
  );
}
