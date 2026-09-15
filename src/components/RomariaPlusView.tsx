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
  Move,
  Sparkle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Certificado, AjusteOverlayRomariaPlus } from "@/types/database";

// Fonte própria para o título — auto-hospedada (pacote @fontsource, sem
// depender do Google Fonts em tempo de execução nem de build) em vez da
// fonte serifada genérica do sistema usada até a Rodada 16, para dar ao
// título "Romaria para Aparecida" uma aparência mais elegante/editorial,
// como pedido pelo usuário na Rodada 17.
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/800.css";
import "@fontsource/playfair-display/700-italic.css";

const FONTE_TITULO = '"Playfair Display", serif';

// Formato vertical (9:16) — o mesmo formato do Instagram Stories e do
// WhatsApp Status, priorizado conforme especificação da Romaria Plus.
// Estrutura preparada para no futuro oferecer outros formatos (quadrado,
// horizontal) sem alterar o restante do componente.
const ARTE_LARGURA = 1080;
const ARTE_ALTURA = 1920;

type Modelo = "classico" | "destaque" | "painel" | "moldura";

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

// "classico" e "painel" sobrepõem o texto direto na foto (por isso podem
// tampar rostos/pessoas) — só esses dois ganham o editor de posição/tamanho
// da Rodada 17. "destaque" e "moldura" já separam foto e texto em áreas
// próprias por construção do próprio layout, então nunca precisam disso.
const MODELOS: { id: Modelo; nome: string; temAjuste: boolean }[] = [
  { id: "classico", nome: "Clássico", temAjuste: true },
  { id: "destaque", nome: "Foto em destaque", temAjuste: false },
  { id: "painel", nome: "Painel flutuante", temAjuste: true },
  { id: "moldura", nome: "Moldura dourada", temAjuste: false },
];

const AJUSTE_PADRAO: Record<Modelo, AjusteOverlayRomariaPlus | null> = {
  classico: { x: 50, y: 80, escala: 100 },
  destaque: null,
  painel: { x: 50, y: 78, escala: 100 },
  moldura: null,
};

// Fora do componente de propósito: o lint de pureza de hooks trata qualquer
// função declarada dentro do componente como parte da renderização, mesmo
// quando só roda depois de um clique — e reclama de `Date.now()` (usado
// aqui só para evitar cache do navegador numa URL que é sempre a mesma
// para a mesma compra, já que o upload usa upsert).
async function enviarFotoParaStorage(caminho: string, arquivo: File) {
  const supabase = createClient();
  const { error: erroUpload } = await supabase.storage
    .from("romaria-plus-fotos")
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || "image/jpeg" });
  if (erroUpload) throw erroUpload;
  const { data } = supabase.storage.from("romaria-plus-fotos").getPublicUrl(caminho);
  return `${data.publicUrl}?v=${Date.now()}`;
}

// Painel de texto arrastável e redimensionável, usado pelos modelos
// "classico" e "painel" (Rodada 17). Posição (x/y, % do tamanho da arte) e
// tamanho (escala, %) vêm controlados pelo componente pai — este componente
// só traduz gestos de ponteiro/toque em novos valores, sem guardar estado
// próprio, para o pai poder persistir a posição no servidor.
function PainelAjustavel({
  ajuste,
  editando,
  containerRef,
  onArrastar,
  onSoltarArraste,
  className,
  children,
}: {
  ajuste: AjusteOverlayRomariaPlus;
  editando: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onArrastar: (ajuste: AjusteOverlayRomariaPlus) => void;
  onSoltarArraste: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const arrastandoRef = useRef(false);

  function aoPressionar(e: React.PointerEvent<HTMLDivElement>) {
    if (!editando) return;
    e.preventDefault();
    e.stopPropagation();
    arrastandoRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastandoRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onArrastar({
      ...ajuste,
      x: Math.min(88, Math.max(12, x)),
      y: Math.min(93, Math.max(10, y)),
    });
  }

  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastandoRef.current) return;
    arrastandoRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onSoltarArraste();
  }

  return (
    <div
      className={`absolute ${editando ? "cursor-grab rounded-2xl outline-dashed outline-2 outline-white/80 active:cursor-grabbing" : ""} ${className ?? ""}`}
      style={{
        left: `${ajuste.x}%`,
        top: `${ajuste.y}%`,
        transform: `translate(-50%, -50%) scale(${ajuste.escala / 100})`,
        touchAction: "none",
      }}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
    >
      {children}
      {editando && (
        <div className="pointer-events-none absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white">
          <Move size={10} /> arraste para mover
        </div>
      )}
    </div>
  );
}

interface Props {
  certificado: Certificado;
  // Presentes só quando a compra já está paga (ver certificado/page.tsx) —
  // usados para persistir a foto/modelo escolhidos no servidor (Rodada 15:
  // antes só existiam na memória do navegador, então a administração não
  // tinha como ver/baixar/editar nada).
  compraId: string;
  userId: string;
  fotoUrlInicial?: string | null;
  modeloInicial?: Modelo | null;
  ajusteInicial?: AjusteOverlayRomariaPlus | null;
}

export default function RomariaPlusView({
  certificado: c,
  compraId,
  userId,
  fotoUrlInicial = null,
  modeloInicial = null,
  ajusteInicial = null,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  // Arquivo ainda não enviado ao servidor (enquanto o upload não termina) —
  // e a última URL já persistida (bucket romaria-plus-fotos), para não
  // reenviar a mesma foto de novo só porque o modelo mudou.
  const arquivoPendenteRef = useRef<File | null>(null);
  const fotoRemotaRef = useRef<string | null>(fotoUrlInicial);
  const ajusteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fotoUrl, setFotoUrl] = useState<string | null>(fotoUrlInicial);
  const [modelo, setModelo] = useState<Modelo>(modeloInicial ?? "classico");
  const [ajuste, setAjuste] = useState<AjusteOverlayRomariaPlus>(
    ajusteInicial ?? AJUSTE_PADRAO[modeloInicial ?? "classico"] ?? { x: 50, y: 80, escala: 100 }
  );
  const [editando, setEditando] = useState(false);
  const [gerando, setGerando] = useState<"baixar" | "compartilhar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoSalvar, setAvisoSalvar] = useState<string | null>(null);

  const infoModelo = MODELOS.find((m) => m.id === modelo) ?? MODELOS[0];

  // Libera o object URL da foto ao trocar ou sair da tela, para não vazar
  // memória — só quando é mesmo um blob local (uma foto já persistida no
  // servidor é um link https normal, não deve ser revogado).
  useEffect(() => {
    return () => {
      if (fotoUrl?.startsWith("blob:")) URL.revokeObjectURL(fotoUrl);
      if (ajusteTimeoutRef.current) clearTimeout(ajusteTimeoutRef.current);
    };
  }, [fotoUrl]);

  // Só o ano vem do sistema: nunca é digitado nem fixado no código. Igual à
  // regra já usada no certificado — sempre a data real de conclusão.
  const ano = new Date(c.data_fim ?? c.emitido_em).getFullYear();
  const periodo = formatarPeriodo(c.data_inicio, c.data_fim);
  const tempo = formatarTempoCompacto(c.data_inicio, c.data_fim) ?? c.duracao_texto;

  // Envia a foto (se ainda não tiver sido enviada) e/ou salva o modelo e o
  // ajuste de posição/tamanho escolhidos, via a função segura
  // "salvar_foto_romaria_plus" (só funciona para a própria compra, já paga
  // — ver migration 21/23).
  async function persistirFoto(modeloParaSalvar: Modelo, ajusteParaSalvar: AjusteOverlayRomariaPlus | null) {
    setAvisoSalvar(null);
    try {
      const supabase = createClient();
      let url = fotoRemotaRef.current;
      const arquivo = arquivoPendenteRef.current;
      if (arquivo) {
        url = await enviarFotoParaStorage(`${userId}/${compraId}.jpg`, arquivo);
        fotoRemotaRef.current = url;
        arquivoPendenteRef.current = null;
      }
      if (!url) return;
      const { error: erroRpc } = await supabase.rpc("salvar_foto_romaria_plus", {
        p_compra_id: compraId,
        p_foto_url: url,
        p_modelo: modeloParaSalvar,
        p_ajuste_overlay: ajusteParaSalvar,
      });
      if (erroRpc) throw erroRpc;
    } catch {
      setAvisoSalvar(
        "Não foi possível salvar a foto no servidor agora — ainda dá para baixar/compartilhar normalmente, mas pode ser preciso escolher a foto de novo depois."
      );
    }
  }

  // Salva a posição/tamanho só depois de a pessoa parar de mexer por um
  // instante — evita mandar uma chamada ao servidor a cada pixel arrastado.
  function agendarPersistirAjuste(novoAjuste: AjusteOverlayRomariaPlus) {
    if (ajusteTimeoutRef.current) clearTimeout(ajusteTimeoutRef.current);
    ajusteTimeoutRef.current = setTimeout(() => {
      void persistirFoto(modelo, novoAjuste);
    }, 600);
  }

  function escolherModelo(m: Modelo) {
    setModelo(m);
    setEditando(false);
    const padrao = AJUSTE_PADRAO[m];
    if (padrao) setAjuste(padrao);
    if (fotoUrl) void persistirFoto(m, padrao ?? ajuste);
  }

  function centralizarAjuste() {
    const padrao = AJUSTE_PADRAO[modelo] ?? { x: 50, y: 80, escala: 100 };
    setAjuste(padrao);
    void persistirFoto(modelo, padrao);
  }

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    arquivoPendenteRef.current = arquivo;
    setFotoUrl((anterior) => {
      if (anterior?.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(arquivo);
    });
    void persistirFoto(modelo, ajuste);
  }

  function trocarFoto() {
    setFotoUrl((anterior) => {
      if (anterior?.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  async function gerarPng(): Promise<string | null> {
    if (!ref.current) return null;
    const { toPng } = await import("html-to-image");
    return toPng(ref.current, { pixelRatio: 2 });
  }

  // Sai do modo de ajuste antes de gerar a imagem final, para a moldura
  // tracejada e o rótulo "arraste para mover" nunca aparecerem no PNG
  // baixado/compartilhado — mesmo que a pessoa tenha esquecido de concluir
  // o ajuste antes de clicar em baixar/compartilhar.
  async function sairDoModoAjuste() {
    if (!editando) return;
    setEditando(false);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function baixar() {
    setErro(null);
    setGerando("baixar");
    try {
      await sairDoModoAjuste();
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
      await sairDoModoAjuste();
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

  const simbolos = (
    <>
      <Image
        src="/icons/logo-emblema.png"
        alt="Símbolo do app"
        width={64}
        height={64}
        style={{ width: "10%", height: "auto" }}
        className="rounded-lg"
      />
      <Church size={22} style={{ width: "8cqw", height: "8cqw" }} />
    </>
  );

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
                onClick={() => escolherModelo(m.id)}
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
            {modelo === "classico" && (
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
                <PainelAjustavel
                  ajuste={ajuste}
                  editando={editando}
                  containerRef={ref}
                  onArrastar={setAjuste}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  className="flex w-[86%] flex-col items-center gap-[3%] px-[2%] py-[3%] text-center text-white"
                >
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "7.2cqw", lineHeight: 1.05, textAlign: "center" }}>
                    Romaria para Aparecida
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
                  <div className="mt-[2%] flex w-full items-center justify-center gap-[10%]">{simbolos}</div>
                </PainelAjustavel>
              </>
            )}

            {modelo === "destaque" && (
              <div className="absolute inset-0 flex flex-col items-center bg-gradient-to-br from-amber-800 via-amber-900 to-neutral-900 px-[7%] pt-[8%] pb-[6%] text-center text-white">
                <div className="absolute inset-x-0 top-0 h-[2.2%] bg-stripe-400" />
                <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "6.4cqw", lineHeight: 1.15, textAlign: "center" }}>
                  Romaria para Aparecida
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
                <div className="mt-auto flex w-full items-center justify-center gap-[10%] pt-[6%]">{simbolos}</div>
              </div>
            )}

            {modelo === "painel" && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Vinheta bem sutil, só para garantir contraste nas bordas —
                    diferente do "Clássico", a foto fica quase inteira à
                    vista, sem escurecer o centro da imagem. */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />
                <PainelAjustavel
                  ajuste={ajuste}
                  editando={editando}
                  containerRef={ref}
                  onArrastar={setAjuste}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  className="w-[82%] rounded-3xl bg-gradient-to-br from-amber-900/95 via-amber-950/95 to-neutral-900/95 px-[6%] py-[5%] text-center text-white shadow-2xl ring-1 ring-white/25"
                >
                  <p
                    className="text-stripe-300"
                    style={{ fontFamily: FONTE_TITULO, fontStyle: "italic", fontWeight: 700, fontSize: "3.4cqw", textAlign: "center" }}
                  >
                    O Peregrino apresenta
                  </p>
                  <p
                    className="mt-[1%]"
                    style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "6.6cqw", lineHeight: 1.05, textAlign: "center" }}
                  >
                    Romaria para Aparecida
                  </p>
                  <p className="mt-[2%] font-bold text-stripe-400" style={{ fontSize: "8.4cqw" }}>
                    {ano}
                  </p>
                  <div className="mt-[3%] flex items-center justify-center gap-[6%]" style={{ fontSize: "3.2cqw" }}>
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
                  <div className="mt-[4%] flex items-center justify-center gap-[8%] border-t border-white/20 pt-[4%]">
                    {simbolos}
                  </div>
                </PainelAjustavel>
              </>
            )}

            {modelo === "moldura" && (
              <div className="absolute inset-0 flex flex-col bg-amber-50 p-[3.5%]">
                <div className="flex min-h-0 flex-1 flex-col border-[3px] border-amber-700 p-[2.2%]">
                  <div className="relative flex min-h-0 flex-1 flex-col items-center border border-amber-300 px-[4%] pt-[7%] pb-[4%]">
                    <div className="absolute -top-[4.5%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-800 px-[6%] py-[1.8%] text-white shadow-md">
                      <Image
                        src="/icons/logo-emblema.png"
                        alt=""
                        width={64}
                        height={64}
                        style={{ width: "7%", height: "auto" }}
                        className="rounded-md"
                      />
                      <span className="font-semibold tracking-[0.15em]" style={{ fontSize: "2.3cqw" }}>
                        O PEREGRINO
                      </span>
                    </div>
                    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg ring-2 ring-amber-700/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-[4%] flex flex-col items-center gap-[2%] text-center text-amber-900">
                      <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "5.4cqw", lineHeight: 1.1, textAlign: "center" }}>
                        Romaria para Aparecida
                      </p>
                      <p className="font-bold text-amber-700" style={{ fontSize: "6.2cqw" }}>
                        {ano}
                      </p>
                      <div className="flex items-center justify-center gap-[5%] whitespace-nowrap text-amber-800" style={{ fontSize: "2.4cqw" }}>
                        {periodo && (
                          <span className="flex items-center gap-1">
                            <CalendarDays size={13} className="shrink-0" /> {periodo}
                          </span>
                        )}
                        {tempo && (
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="shrink-0" /> {tempo}
                          </span>
                        )}
                      </div>
                      <div className="mt-[1%] flex items-center justify-center gap-[8%]">
                        <Image
                          src="/icons/logo-emblema.png"
                          alt="Símbolo do app"
                          width={64}
                          height={64}
                          style={{ width: "8%", height: "auto" }}
                          className="rounded-md"
                        />
                        <Church size={18} className="text-amber-800" style={{ width: "6.5cqw", height: "6.5cqw" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {infoModelo.temAjuste && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setEditando((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  editando
                    ? "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                }`}
              >
                <Move size={14} /> {editando ? "Concluir ajuste" : "Ajustar posição do texto"}
              </button>
              {editando && (
                <div className="flex w-full max-w-xs flex-col items-center gap-1.5">
                  <p className="text-center text-xs text-neutral-500">
                    Arraste o texto na prévia acima para não cobrir ninguém na foto.
                  </p>
                  <label htmlFor="tamanho-texto-romaria" className="text-xs font-medium text-neutral-500">
                    Tamanho do texto
                  </label>
                  <input
                    id="tamanho-texto-romaria"
                    type="range"
                    min={70}
                    max={140}
                    step={5}
                    value={ajuste.escala}
                    onChange={(e) => {
                      const novo = { ...ajuste, escala: Number(e.target.value) };
                      setAjuste(novo);
                      agendarPersistirAjuste(novo);
                    }}
                    className="w-full accent-amber-700"
                  />
                  <button
                    type="button"
                    onClick={centralizarAjuste}
                    className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-500"
                  >
                    Centralizar de novo
                  </button>
                </div>
              )}
            </div>
          )}

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
            <p className="flex items-center gap-1 text-xs text-neutral-400">
              <Sparkle size={12} className="shrink-0" /> Dica: o modelo &quot;Moldura dourada&quot; nunca cobre a
              foto — o texto sempre fica numa área própria.
            </p>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            {avisoSalvar && <p className="max-w-xs text-center text-xs text-amber-700 dark:text-amber-500">{avisoSalvar}</p>}
          </div>
        </>
      )}
    </div>
  );
}
