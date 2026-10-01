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
  Route,
  Check,
  Pencil,
  ZoomIn,
  Footprints,
  Medal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Certificado, AjusteOverlayRomariaPlus } from "@/types/database";

// Fonte própria para o título — auto-hospedada como arquivos estáticos em
// /public/fonts (ver src/styles/fonte-titulo-romaria.css) em vez da fonte
// serifada genérica do sistema usada até a Rodada 16, para dar ao título
// "Romaria para Aparecida" uma aparência mais elegante/editorial, como
// pedido pelo usuário na Rodada 17. Trocado do pacote npm @fontsource para
// arquivos estáticos na Rodada 18 depois que o deploy quebrou por falta do
// pacote (o upload manual de arquivos não instala dependências novas).
import "@/styles/fonte-titulo-romaria.css";

const FONTE_TITULO = '"Playfair Display", serif';

// Formato vertical (9:16) — o mesmo formato do Instagram Stories e do
// WhatsApp Status, priorizado conforme especificação da Romaria Plus.
// Estrutura preparada para no futuro oferecer outros formatos (quadrado,
// horizontal) sem alterar o restante do componente.
const ARTE_LARGURA = 1080;
const ARTE_ALTURA = 1920;

export type Modelo =
  | "classico"
  | "destaque"
  | "painel"
  | "moldura"
  | "itinerario"
  | "selo"
  // Rodada 49 — quatro modelos novos (Migration 43 libera no banco).
  | "basilica"
  | "santa"
  | "terco"
  | "postal"
  | "credencial";

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
// "itinerario" e "selo" (Rodada 27, fase 1 de uma leva maior de modelos
// novos) também têm o texto/gráfico numa posição fixa própria do layout —
// sem editor de posição por enquanto, para entregar o essencial primeiro.
// Rodada 30: "itinerario" e "selo" ganharam temAjuste=true (a pedido do
// usuário — "tem que ter como movimentar e dimensionar") e agora usam o
// mesmo PainelAjustavel de classico/painel para o bloco de texto/gráfico.
// Rodada 54: `soAdmin` — o modelo "Basílica de Aparecida" fica visível só
// para administradores até o usuário confirmar os direitos de uso da foto
// da Basílica (quem já salvou uma arte nele continua vendo a arte salva).
const MODELOS: { id: Modelo; nome: string; temAjuste: boolean; soAdmin?: boolean }[] = [
  { id: "classico", nome: "Clássico", temAjuste: true },
  { id: "destaque", nome: "Foto em destaque", temAjuste: false },
  { id: "painel", nome: "Painel flutuante", temAjuste: true },
  { id: "moldura", nome: "Moldura dourada", temAjuste: false },
  { id: "itinerario", nome: "Itinerário", temAjuste: true },
  { id: "selo", nome: "Selo de conquista", temAjuste: true },
  { id: "basilica", nome: "Basílica de Aparecida", temAjuste: true, soAdmin: true },
  { id: "santa", nome: "Nossa Senhora Aparecida", temAjuste: true },
  { id: "terco", nome: "Terço", temAjuste: false },
  { id: "postal", nome: "Cartão-postal", temAjuste: false },
  { id: "credencial", nome: "Credencial do peregrino", temAjuste: false },
];

// Transparência do fundo escurecido do "Selo de conquista" (Rodada 30, a
// pedido do usuário — "tem que... deixar mais transparente"): 0 = bem
// escuro (como era fixo antes), 100 = foto bem visível. Controla tanto a
// opacidade da própria foto quanto a intensidade do gradiente escuro por
// cima dela, já que os dois juntos é que determinam quanto da foto aparece.
const TRANSPARENCIA_SELO_PADRAO = 40;

// Rodada 52 — desenho a lápis da Basílica enviado pelo usuário, tratado
// para virar só o traço (fundo de papel transparente) em duas cores, mais
// a versão original em papel. Rodada 53: a ilustração colorida em SVG
// saiu (o usuário não gostou) e entrou a foto real da Basílica enviada
// por ele, recortada com as bordas esmaecidas. Arquivos em public/arte/.
type EstiloDesenho = "claro" | "escuro" | "papel" | "foto";
const ESTILOS_DESENHO: { id: EstiloDesenho; nome: string }[] = [
  { id: "claro", nome: "Traço claro" },
  { id: "escuro", nome: "Traço escuro" },
  { id: "papel", nome: "Desenho no papel" },
  { id: "foto", nome: "Foto da Basílica" },
];
// Rodada 57 — as listras do Cartão-postal e os veios do Terço eram
// "repeating-linear-gradient", que o motor reserva de geração da imagem
// (usado em alguns computadores) não desenha direito — saía uma moldura
// vermelha lisa. Agora são desenhos SVG do tamanho da arte (1080x1920),
// que os dois motores desenham igual.
function svgFundo(conteudo: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" preserveAspectRatio="none">${conteudo}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 100% 100% no-repeat`;
}
const FUNDO_LISTRAS_CORREIO = svgFundo(
  '<defs><pattern id="l" patternUnits="userSpaceOnUse" width="129.6" height="4000" patternTransform="rotate(45)">' +
    '<rect width="32.4" height="4000" fill="#b91c1c"/><rect x="32.4" width="32.4" height="4000" fill="#fffdf7"/>' +
    '<rect x="64.8" width="32.4" height="4000" fill="#1d4ed8"/><rect x="97.2" width="32.4" height="4000" fill="#fffdf7"/>' +
    '</pattern></defs><rect width="1080" height="1920" fill="url(#l)"/>'
);
const FUNDO_VEIOS_MADEIRA = svgFundo(
  '<defs><pattern id="v" patternUnits="userSpaceOnUse" width="16.2" height="1920">' +
    '<rect width="6.5" height="1920" fill="rgba(0,0,0,0.05)"/><rect x="6.5" width="9.7" height="1920" fill="rgba(255,255,255,0.03)"/>' +
    '</pattern></defs><rect width="1080" height="1920" fill="url(#v)"/>'
);

// Rodada 57 — modelo "Nossa Senhora Aparecida", nos mesmos moldes da
// Basílica, para todos: desenho a lápis enviado pelo usuário (traço claro,
// traço escuro ou no papel) ou a versão colorida do ícone do app.
const ESTILOS_SANTA: { id: EstiloDesenho; nome: string }[] = [
  { id: "claro", nome: "Traço claro" },
  { id: "escuro", nome: "Traço escuro" },
  { id: "papel", nome: "Desenho no papel" },
  { id: "foto", nome: "Colorida" },
];
// Fundo do modelo Basílica: começa mais escuro que o do Selo, porque o
// traço claro precisa de contraste.
const TRANSPARENCIA_FUNDO_BASILICA_PADRAO = 20;

// Frase do título (Rodada 28, a pedido do usuário) — antes era sempre
// "Romaria para Aparecida", fixo em todos os modelos. Agora o peregrino
// escolhe a frase, independente do modelo (igual ao ajuste de foto/zoom) —
// "peregrinacao" é o padrão, no lugar do texto antigo (trocado de "Romaria"
// para "Peregrinação", já que "Romaria" virou o nome da funcionalidade de
// romarias em grupo). Rodada 29: duas frases novas ("comigo"/"obrigado") e
// uma opção "personalizada" (texto == null aqui; o texto real digitado fica
// em ajuste.fraseCustom — ver tituloTexto abaixo). O ano ao lado da frase
// continua sempre fixo (o da conclusão), sem opção de mudar, em qualquer
// escolha.
type FraseTitulo = "peregrinacao" | "venci" | "gracas" | "comigo" | "obrigado" | "personalizada";
const FRASES_TITULO: { id: FraseTitulo; nome: string; texto: string | null }[] = [
  { id: "peregrinacao", nome: "Peregrinação para Aparecida", texto: "Peregrinação para Aparecida" },
  { id: "venci", nome: "Eu fui e venci!", texto: "Eu fui e venci!" },
  { id: "gracas", nome: "Graças alcançadas!", texto: "Graças alcançadas!" },
  { id: "comigo", nome: "Ela caminhou comigo!", texto: "Ela caminhou comigo!" },
  { id: "obrigado", nome: "Obrigado, Nossa Senhora Aparecida!", texto: "Obrigado, Nossa Senhora Aparecida!" },
  { id: "personalizada", nome: "Digitar minha frase...", texto: null },
];
const FRASE_CUSTOM_MAX = 42;

const AJUSTE_PADRAO: Record<Modelo, AjusteOverlayRomariaPlus | null> = {
  classico: { x: 50, y: 80, escala: 100 },
  destaque: null,
  painel: { x: 50, y: 78, escala: 100 },
  moldura: null,
  // itinerario/selo (Rodada 30): título+gráfico/medalha+dados agora são um
  // bloco único arrastável/redimensionável, centralizado por padrão.
  itinerario: { x: 50, y: 55, escala: 100 },
  selo: { x: 50, y: 56, escala: 100 },
  basilica: { x: 50, y: 72, escala: 100 },
  santa: { x: 50, y: 60, escala: 100 },
  terco: null,
  postal: null,
  credencial: null,
};

// Posição/zoom padrão da FOTO em si dentro do recorte de cada modelo (Rodada
// 23) — diferente do AJUSTE_PADRAO acima, que é só do painel de texto. Vale
// para os 4 modelos, já que todos recortam a foto (object-fit: cover) para
// caber no espaço reservado a ela.
const FOTO_POS_PADRAO = { x: 50, y: 50 };
const FOTO_ESCALA_PADRAO = 100;

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

// Rodada 56 — guarda a arte pronta (PNG) no mesmo bucket, ao lado da foto.
async function enviarArteParaStorage(caminho: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("romaria-plus-fotos")
    .upload(caminho, blob, { upsert: true, contentType: "image/png" });
  if (error) throw error;
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
  transparenciaNoPainel = true,
}: {
  ajuste: AjusteOverlayRomariaPlus;
  editando: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onArrastar: (ajuste: AjusteOverlayRomariaPlus) => void;
  onSoltarArraste: () => void;
  className?: string;
  children: React.ReactNode;
  // false quando o próprio modelo aplica a transparência só no texto (o
  // modelo "Basílica" tem transparência separada para o desenho).
  transparenciaNoPainel?: boolean;
}) {
  // Rodada 49 — transparência do bloco de texto (0 = sólido, até 70 = bem
  // transparente), a pedido do usuário para o "Selo de conquista" e
  // oferecida em todos os modelos com texto ajustável.
  const opacidade = 1 - Math.min(70, Math.max(0, ajuste.transparenciaTexto ?? 0)) / 100;
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
      // pointer-events-none quando !editando (Rodada 30): sem isso, este
      // painel — mesmo sem nada clicável quando não está em modo de
      // edição — ainda fica por cima da camada de arraste da FOTO
      // (FotoAjustavel, mais cedo no DOM) em toda a área que ocupa,
      // bloqueando o gesto de arrastar a foto sempre que o dedo/cursor
      // passa por cima do texto. Era exatamente o bug do "Selo de
      // conquista" na Rodada 28 (ali corrigido manualmente); aqui vira a
      // regra geral do componente, já que agora "Itinerário" e "Selo"
      // também usam este mesmo painel arrastável/redimensionável.
      className={`absolute ${editando ? "cursor-grab rounded-2xl outline-dashed outline-2 outline-white/80 active:cursor-grabbing" : "pointer-events-none"} ${className ?? ""}`}
      style={{
        left: `${ajuste.x}%`,
        top: `${ajuste.y}%`,
        transform: `translate(-50%, -50%) scale(${ajuste.escala / 100})`,
        touchAction: "none",
        opacity: transparenciaNoPainel ? opacidade : 1,
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

// Camada transparente sobre a foto para reposicioná-la dentro do seu recorte
// (Rodada 23, a pedido do usuário: "na edição com molduras ele conseguisse
// ajustar a foto para que não corte a parte desejada"). Diferente do
// PainelAjustavel acima (que move um painel de texto para uma posição
// absoluta em x/y%), aqui o arraste é RELATIVO — cada movimento do ponteiro
// desloca o object-position atual pela distância arrastada, do jeito que se
// espera ao "empurrar" uma foto por trás de uma janela fixa (arrastar para a
// direita revela mais do lado esquerdo da foto original, então o valor de
// object-position diminui).
function FotoAjustavel({
  editando,
  onArrastar,
  onSoltarArraste,
}: {
  editando: boolean;
  onArrastar: (delta: { dx: number; dy: number }) => void;
  onSoltarArraste: () => void;
}) {
  const ultimaPosRef = useRef<{ x: number; y: number } | null>(null);

  function aoPressionar(e: React.PointerEvent<HTMLDivElement>) {
    if (!editando) return;
    e.preventDefault();
    e.stopPropagation();
    ultimaPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    if (!editando || !ultimaPosRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = ((e.clientX - ultimaPosRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - ultimaPosRef.current.y) / rect.height) * 100;
    ultimaPosRef.current = { x: e.clientX, y: e.clientY };
    onArrastar({ dx, dy });
  }

  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    if (!ultimaPosRef.current) return;
    ultimaPosRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onSoltarArraste();
  }

  return (
    <div
      className={`absolute inset-0 z-10 ${editando ? "cursor-grab touch-none active:cursor-grabbing" : "pointer-events-none"}`}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
    >
      {editando && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white">
            <Move size={10} /> arraste a foto para reposicionar
          </span>
        </div>
      )}
    </div>
  );
}

// Foto com pan (arraste) + zoom que funciona nas duas direções, sempre —
// Rodada 28, corrigindo um bug reportado pelo usuário em vários modelos
// ("a foto só mexe para cima e para baixo, mesmo dando zoom não consigo ir
// para o lado" no "Foto em destaque"; "não tem como posicionar, nem
// dimensionar" no "Itinerário"; "sem ter como ajustar" no "Selo de
// conquista"). A causa raiz: o código antigo usava `object-fit: cover` +
// `object-position` (que recorta a foto para caber na caixa ANTES de
// qualquer zoom) e só depois aplicava um `transform: scale()` puramente
// visual por cima — como o navegador decide o recorte de cover/posição
// usando só a caixa já no tamanho final (sem "ver" o scale seguinte), o eixo
// em que a foto já "bate certinho" na caixa (largura ou altura, dependendo
// da proporção da própria foto) fica sem nenhuma folga para arrastar, e dar
// zoom depois não muda isso. Aqui a foto é medida (dimensão real) e
// posicionada em pixels calculados à mão: o tamanho renderizado já embute o
// zoom antes do corte ser decidido, então tanto x quanto y sempre ganham
// folga de arraste assim que há zoom, e a folga natural (quando a foto não é
// exatamente da mesma proporção da caixa) continua funcionando mesmo sem
// zoom — igual ao comportamento que já funcionava bem no "Clássico".
function FotoComPanZoom({
  src,
  fotoPos,
  fotoEscala,
  editando,
  onArrastar,
  onSoltarArraste,
  className,
  imgClassName,
  imgOpacidade,
}: {
  src: string;
  fotoPos: { x: number; y: number };
  fotoEscala: number;
  editando: boolean;
  onArrastar: (delta: { dx: number; dy: number }) => void;
  onSoltarArraste: () => void;
  className?: string;
  imgClassName?: string;
  // Opacidade numérica (0 a 1) aplicada via inline style, não via classe
  // Tailwind (Rodada 30, controle de transparência do "Selo de conquista")
  // — como o valor varia continuamente conforme o slider da pessoa, uma
  // classe como `opacity-[0.53]` não funcionaria: o Tailwind só gera CSS
  // para classes que aparecem literalmente no código-fonte, não para
  // strings montadas em tempo de execução.
  imgOpacidade?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tamanhoContainer, setTamanhoContainer] = useState<{ w: number; h: number } | null>(null);
  const [tamanhoNatural, setTamanhoNatural] = useState<{ w: number; h: number } | null>(null);

  // Zera a medida anterior assim que a foto muda — feito durante a
  // renderização (padrão do React para "resetar estado quando uma prop
  // muda"), não dentro do efeito abaixo, pra não disparar setState síncrono
  // no corpo do efeito (regra react-hooks/set-state-in-effect).
  const [srcMedido, setSrcMedido] = useState(src);
  if (srcMedido !== src) {
    setSrcMedido(src);
    setTamanhoNatural(null);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const medir = () => setTamanhoContainer({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.onload = () => setTamanhoNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  // "cover": a escala mínima que garante que a foto cobre a caixa inteira,
  // multiplicada pelo zoom escolhido (100% = só cobre, sem folga extra).
  const escalaBase =
    tamanhoNatural && tamanhoContainer && tamanhoContainer.w > 0 && tamanhoContainer.h > 0
      ? Math.max(tamanhoContainer.w / tamanhoNatural.w, tamanhoContainer.h / tamanhoNatural.h)
      : null;
  const larguraRenderizada = escalaBase && tamanhoNatural ? tamanhoNatural.w * escalaBase * (fotoEscala / 100) : null;
  const alturaRenderizada = escalaBase && tamanhoNatural ? tamanhoNatural.h * escalaBase * (fotoEscala / 100) : null;
  const folgaX = larguraRenderizada && tamanhoContainer ? Math.max(0, larguraRenderizada - tamanhoContainer.w) : 0;
  const folgaY = alturaRenderizada && tamanhoContainer ? Math.max(0, alturaRenderizada - tamanhoContainer.h) : 0;
  const esquerda = larguraRenderizada ? -((fotoPos.x / 100) * folgaX) : 0;
  const topo = alturaRenderizada ? -((fotoPos.y / 100) * folgaY) : 0;

  return (
    <div ref={containerRef} className={className ?? "absolute inset-0 overflow-hidden"}>
      {larguraRenderizada != null && alturaRenderizada != null ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          crossOrigin="anonymous"
          className={imgClassName}
          style={{
            position: "absolute",
            width: `${larguraRenderizada}px`,
            height: `${alturaRenderizada}px`,
            maxWidth: "none",
            left: `${esquerda}px`,
            top: `${topo}px`,
            opacity: imgOpacidade,
          }}
        />
      ) : (
        // Antes de medir a foto/caixa (primeiro instante de carregamento),
        // usa o "cover" nativo do navegador como aproximação — evita um
        // flash de foto ausente ou mal posicionada.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          crossOrigin="anonymous"
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName ?? ""}`}
          style={{ opacity: imgOpacidade }}
        />
      )}
      <FotoAjustavel editando={editando} onArrastar={onArrastar} onSoltarArraste={onSoltarArraste} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Rodada 49 — peças desenhadas dos 4 modelos novos. Todas em SVG/HTML
// próprios (nada de imagem externa), para a arte sempre sair igual no PNG.
// ---------------------------------------------------------------------

// Terço (Rodada 54): imagem enviada pelo usuário — terço de madeira com a
// medalha de Nossa Senhora Aparecida sobre papel artesanal, numa mesa de
// madeira —, tratada para o papel de DENTRO do terço ficar transparente
// (public/arte/terco-madeira.webp, 765x1024). A foto do peregrino fica por
// baixo, neste retângulo (em pixels da imagem), e aparece entre as contas.
const TERCO_IMG = { largura: 765, altura: 1024, x0: 110, y0: 120, x1: 666, y1: 902, canto: 26 };

// Selo postal com borda serrilhada, para o "Cartão-postal".
function SeloPostal({ ano }: { ano: number }) {
  const furos = Array.from({ length: 9 }, (_, i) => 6 + i * 11);
  // Rodada 53: a figura do selo passou a ser a foto real da Basílica (em
  // HTML, por cima do SVG do papel serrilhado).
  return (
    <div className="relative w-full drop-shadow" style={{ aspectRatio: "100 / 120" }}>
    <svg viewBox="0 0 100 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect x="2" y="2" width="96" height="116" fill="#fffdf7" />
      {furos.map((p) => (
        <g key={p} fill="#f3e9d2">
          <circle cx={p} cy="2" r="3" />
          <circle cx={p} cy="118" r="3" />
        </g>
      ))}
      {Array.from({ length: 11 }, (_, i) => 6 + i * 10.8).map((p) => (
        <g key={p} fill="#f3e9d2">
          <circle cx="2" cy={p} r="3" />
          <circle cx="98" cy={p} r="3" />
        </g>
      ))}
      <rect x="10" y="10" width="80" height="100" fill="#1e3a8a" />
      <text x="50" y="86" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fde68a" fontFamily="sans-serif">
        APARECIDA
      </text>
      <text x="50" y="101" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fbbf24" fontFamily="sans-serif">
        {ano}
      </text>
    </svg>
      {/* Rodada 54: desenho a lápis enviado pelo usuário, no lugar da foto
          da Basílica (que ficou restrita ao admin até conferir os direitos). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/arte/basilica-desenho-papel.webp"
        alt=""
        className="absolute object-cover"
        style={{ left: "10%", top: `${(10 / 120) * 100}%`, width: "80%", height: `${(62 / 120) * 100}%` }}
        draggable={false}
      />
    </div>
  );
}

// Rodada 60 — nome curto de cidade para os carimbos quando são muitos.
const ABREVIACOES_CIDADE: Record<string, string> = {
  "sao jose dos campos": "S. J. Campos",
  pindamonhangaba: "Pinda",
  "cachoeira paulista": "Cach. Paulista",
  guaratingueta: "Guará",
  "santa isabel": "Sta. Isabel",
  "rio de janeiro": "Rio de Jan.",
  "sao paulo": "S. Paulo",
};
function abreviarCidade(cidade: string): string {
  const chave = cidade.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-sp$|\/sp$/, "").trim();
  if (ABREVIACOES_CIDADE[chave]) return ABREVIACOES_CIDADE[chave];
  if (cidade.length <= 12) return cidade;
  // Genérico: abrevia as primeiras palavras ("Nova Cidade Grande" -> "N. C. Grande").
  const palavras = cidade.trim().split(/\s+/);
  if (palavras.length === 1) return `${cidade.slice(0, 10)}.`;
  const ultima = palavras.pop() as string;
  return [...palavras.map((p) => (/^(de|da|do|dos|das)$/i.test(p) ? "" : `${p[0].toUpperCase()}.`)).filter(Boolean), ultima].join(" ");
}

// Carimbo de cidade da "Credencial do peregrino" — cores, formatos e
// inclinações alternados pela posição, para parecer carimbado à mão.
const CORES_CARIMBO = ["#1d4ed8", "#b91c1c", "#15803d", "#7e22ce", "#b45309", "#0f766e"];
const GIROS_CARIMBO = [-8, 5, -3, 7, -6, 3, -4, 8, -2, 6, -7, 4];

function Carimbo({
  cidade,
  rotulo,
  indice,
  destaque,
  largura,
}: {
  cidade: string;
  rotulo: string;
  indice: number;
  destaque?: boolean;
  largura: number;
}) {
  // Tamanho da fonte acompanha a largura do carimbo (em % da arte).
  const fator = largura / 22;
  const cor = destaque ? "#b45309" : CORES_CARIMBO[indice % CORES_CARIMBO.length];
  const redondo = destaque || indice % 2 === 0;
  return (
    <div
      className={`relative flex flex-col items-center justify-center text-center ${redondo ? "rounded-full" : "rounded-lg"}`}
      style={{
        width: `${largura}%`,
        aspectRatio: "1 / 1",
        border: `0.55cqw solid ${cor}`,
        color: cor,
        transform: `rotate(${GIROS_CARIMBO[indice % GIROS_CARIMBO.length]}deg)`,
        opacity: 0.88,
        background: destaque ? "rgba(251,191,36,0.18)" : "transparent",
      }}
    >
      <div
        className={`absolute ${redondo ? "rounded-full" : "rounded-md"}`}
        style={{ inset: "6%", border: `0.25cqw dashed ${cor}` }}
      />
      <span className="font-bold uppercase" style={{ fontSize: `${1.4 * fator}cqw`, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
        {rotulo}
      </span>
      <span
        className="px-[10%] font-black uppercase leading-tight"
        style={{
          fontSize: `${(cidade.length > 12 ? 1.55 : cidade.length > 8 ? 1.85 : 2.3) * fator}cqw`,
          textAlign: "center",
          overflowWrap: cidade.length > 12 ? "anywhere" : "normal",
        }}
      >
        {cidade}
      </span>
    </div>
  );
}

// Trajeto esquemático origem -> Aparecida (Rodada 49): o nome de cada
// cidade fica colado na sua bolinha — a origem logo abaixo da bolinha branca
// (esquerda) e "Aparecida-SP" logo acima da bolinha amarela (direita), em
// vez de os dois nomes ficarem numa linha solta embaixo do desenho. Usado
// pelo "Itinerário" e pelo "Foto em destaque".
function TrajetoOrigemAparecida({ origem, tamanhoFonte }: { origem: string; tamanhoFonte: string }) {
  return (
    <div className="relative w-full text-white" style={{ fontSize: tamanhoFonte, paddingTop: "1.9em", paddingBottom: "1.9em" }}>
      <span
        className="absolute right-0 top-0 flex max-w-[60%] items-center justify-end gap-1 font-bold text-stripe-400"
        style={{ textAlign: "right", lineHeight: 1.15, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}
      >
        <Church size={14} className="shrink-0" style={{ width: "1.1em", height: "1.1em" }} /> Aparecida-SP
      </span>
      <svg viewBox="0 0 100 24" className="block w-full" style={{ opacity: 0.9 }}>
        <path
          d="M6,19 C30,22 40,3 60,6 C74,8 82,2 94,5"
          fill="none"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          strokeDasharray="3,3.2"
          strokeLinecap="round"
        />
        <circle cx="6" cy="19" r="3.2" fill="white" fillOpacity="0.95" />
        <circle cx="94" cy="5" r="3.6" fill="#fbbf24" fillOpacity="0.98" />
      </svg>
      <span
        className="absolute bottom-0 left-0 flex max-w-[60%] items-center gap-1 font-bold"
        style={{ textAlign: "left", lineHeight: 1.15, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}
      >
        <Footprints size={14} className="shrink-0" style={{ width: "1.1em", height: "1.1em" }} /> {origem}
      </span>
    </div>
  );
}

interface Props {
  certificado: Certificado;
  // Presentes só quando a compra já está paga (ver
  // certificado/plus/[certificadoId]/page.tsx) — usados para persistir a
  // foto/modelo escolhidos no servidor (Rodada 15: antes só existiam na
  // memória do navegador). A partir da Rodada 18 cada compra pode ter até 5
  // fotos independentes (uma arte por foto) — `indice` (1 a 5) identifica
  // qual delas este componente está editando; `onSalvo` avisa o componente
  // pai (a galeria) sempre que uma foto/modelo/ajuste é salvo com sucesso,
  // para atualizar a lista de slots preenchidos.
  compraId: string;
  userId: string;
  indice: number;
  fotoUrlInicial?: string | null;
  modeloInicial?: Modelo | null;
  ajusteInicial?: AjusteOverlayRomariaPlus | null;
  contadorDownloadsInicial?: number;
  contadorCompartilhamentosInicial?: number;
  // Rodada 49 — cidades com check-in nesta peregrinação, na ordem em que
  // foram feitos (carimbos da "Credencial do peregrino").
  cidadesCheckin?: string[];
  // Rodada 54 — libera os modelos marcados como soAdmin.
  ehAdmin?: boolean;
  onSalvo?: (dados: { indice: number; foto_url: string; modelo: Modelo; ajuste_overlay: AjusteOverlayRomariaPlus | null }) => void;
  // Rodada 56 — avisa a galeria que a arte desta foto foi salva (primeiro
  // download/compartilhamento), para ela passar para a próxima foto.
  onArteSalva?: (dados: { indice: number; arte_url: string; evento: "download" | "compartilhamento" }) => void;
}

export default function RomariaPlusView({
  certificado: c,
  compraId,
  userId,
  indice,
  fotoUrlInicial = null,
  modeloInicial = null,
  ajusteInicial = null,
  contadorDownloadsInicial = 0,
  contadorCompartilhamentosInicial = 0,
  cidadesCheckin = [],
  ehAdmin = false,
  onSalvo,
  onArteSalva,
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
  const [ajuste, setAjuste] = useState<AjusteOverlayRomariaPlus>(() => {
    const base = ajusteInicial ?? AJUSTE_PADRAO[modeloInicial ?? "classico"] ?? { x: 50, y: 80, escala: 100 };
    return {
      ...base,
      fotoPos: ajusteInicial?.fotoPos ?? FOTO_POS_PADRAO,
      fotoEscala: ajusteInicial?.fotoEscala ?? FOTO_ESCALA_PADRAO,
    };
  });
  const [editando, setEditando] = useState(false);
  // Ajuste da FOTO (posição/zoom dentro do recorte), separado do ajuste do
  // painel de texto acima — Rodada 23. Só um dos dois modos de arraste fica
  // ativo por vez (ver alternarEdicaoTexto/alternarEdicaoFoto).
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [gerando, setGerando] = useState<"baixar" | "compartilhar" | null>(null);
  const [salvandoArte, setSalvandoArte] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoSalvar, setAvisoSalvar] = useState<string | null>(null);
  const [contadorDownloads, setContadorDownloads] = useState(contadorDownloadsInicial);
  const [contadorCompartilhamentos, setContadorCompartilhamentos] = useState(contadorCompartilhamentosInicial);
  // Rodada 23, a pedido do usuário: antes dava para baixar/compartilhar a
  // qualquer momento, o que confundia (a pessoa mexia de novo sem perceber
  // que já tinha baixado aquela versão). Agora é preciso "Finalizar edição"
  // antes de baixar/compartilhar — a partir daí a foto/modelo/ajustes ficam
  // travados (as opções de edição somem) até a pessoa optar por "Editar
  // novamente". Uma foto que já veio salva do servidor (reabrindo a tela)
  // começa direto finalizada, sem precisar confirmar de novo.
  const [finalizado, setFinalizado] = useState(!!fotoUrlInicial);

  const infoModelo = MODELOS.find((m) => m.id === modelo) ?? MODELOS[0];
  const fotoPos = ajuste.fotoPos ?? FOTO_POS_PADRAO;
  const fotoEscala = ajuste.fotoEscala ?? FOTO_ESCALA_PADRAO;

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
  // Distância aproximada percorrida (Rodada 22) — ausente em certificados
  // emitidos antes dessa rodada, então some do layout sem deixar buraco.
  const distancia = c.distancia_km != null ? `≈ ${c.distancia_km} km` : null;
  // Cidade de origem gravada no próprio certificado (Rodada 23) — usada só
  // pelos modelos "itinerario" (Rodada 27), que mostram de onde a pessoa
  // saiu até Aparecida-SP.
  const origem = c.origem;
  // Rodada 49: certificados antigos não têm a origem gravada — a página
  // completa com a cidade de origem da própria peregrinação (ver
  // certificado/plus/[certificadoId]/page.tsx); só sem nenhuma das duas é
  // que aparece o texto genérico.
  const nomeOrigem = origem?.trim() || "Origem";
  // Frase do título escolhida (ver FRASES_TITULO acima) — guardada dentro do
  // próprio ajuste, igual a fotoPos/fotoEscala, independente do modelo. Na
  // opção "personalizada" o texto de verdade vem de ajuste.fraseCustom (com
  // uma frase padrão de reserva caso a pessoa ainda não tenha digitado nada).
  const fraseSelecionada =
    FRASES_TITULO.find((f) => f.id === (ajuste.frase ?? "peregrinacao")) ?? FRASES_TITULO[0];
  const tituloTexto =
    fraseSelecionada.texto ?? (ajuste.fraseCustom?.trim() || FRASES_TITULO[0].texto!);
  // Rodada 57 — frase longa (2 ou 3 linhas) empurrava as datas/dados para
  // fora da arte. Agora o título encolhe conforme o tamanho do texto.
  const fatorTitulo =
    tituloTexto.length <= 22 ? 1 : tituloTexto.length <= 28 ? 0.88 : tituloTexto.length <= 34 ? 0.8 : 0.72;
  const fonteTitulo = (base: number) => `${(base * fatorTitulo).toFixed(2)}cqw`;

  // Transparência do "Selo de conquista" (Rodada 30) — um só controle que
  // afeta tanto a opacidade da foto em si quanto a intensidade do gradiente
  // escuro por cima dela: os dois juntos que determinam quanto da foto
  // aparece por trás do selo/texto. 0 = como era fixo antes (bem escuro),
  // 100 = foto bem visível.
  const transparenciaSelo = ajuste.transparencia ?? TRANSPARENCIA_SELO_PADRAO;
  const fotoOpacidadeSelo = 0.2 + (transparenciaSelo / 100) * 0.7;
  const fatorEscuridaoSelo = 1 - (transparenciaSelo / 100) * 0.65;

  // Modelo "Basílica" (Rodada 52): estilo e transparência do desenho, e
  // quanto o fundo escurece a foto (mesmo campo `transparencia` do Selo).
  const estiloDesenho: EstiloDesenho =
    ajuste.estiloDesenho === "ilustracao" ? "foto" : (ajuste.estiloDesenho ?? "claro");
  const opacidadeDesenho = 1 - Math.min(80, Math.max(0, ajuste.transparenciaDesenho ?? 0)) / 100;
  const transparenciaFundoBasilica = ajuste.transparencia ?? TRANSPARENCIA_FUNDO_BASILICA_PADRAO;
  const fatorEscuridaoBasilica = 1 - (transparenciaFundoBasilica / 100) * 0.85;

  // Envia a foto (se ainda não tiver sido enviada) e/ou salva o modelo e o
  // ajuste de posição/tamanho escolhidos, via a função segura
  // "salvar_foto_romaria_plus_slot" (só funciona para a própria compra, já
  // paga, e sempre para o slot/índice desta foto especificamente — Rodada
  // 18: até 5 fotos independentes por compra, em vez de uma só).
  async function persistirFoto(modeloParaSalvar: Modelo, ajusteParaSalvar: AjusteOverlayRomariaPlus | null) {
    setAvisoSalvar(null);
    try {
      const supabase = createClient();
      let url = fotoRemotaRef.current;
      const arquivo = arquivoPendenteRef.current;
      if (arquivo) {
        url = await enviarFotoParaStorage(`${userId}/${compraId}/${indice}.jpg`, arquivo);
        fotoRemotaRef.current = url;
        arquivoPendenteRef.current = null;
      }
      if (!url) return;
      const { error: erroRpc } = await supabase.rpc("salvar_foto_romaria_plus_slot", {
        p_compra_id: compraId,
        p_indice: indice,
        p_foto_url: url,
        p_modelo: modeloParaSalvar,
        p_ajuste_overlay: ajusteParaSalvar,
      });
      if (erroRpc) throw erroRpc;
      onSalvo?.({ indice, foto_url: url, modelo: modeloParaSalvar, ajuste_overlay: ajusteParaSalvar });
    } catch {
      setAvisoSalvar(
        "Não foi possível salvar a foto no servidor agora — ainda dá para baixar/compartilhar normalmente, mas pode ser preciso escolher a foto de novo depois."
      );
    }
  }

  // Contador de download/compartilhamento desta foto específica — chamado
  // só depois de a arte já ter sido gerada com sucesso; falha aqui não
  // interrompe o download/compartilhamento em si (só não conta a estatística).
  function registrarEvento(evento: "download" | "compartilhamento") {
    if (evento === "download") setContadorDownloads((n) => n + 1);
    else setContadorCompartilhamentos((n) => n + 1);
    const supabase = createClient();
    // Rodada 50: antes era "void supabase.rpc(...)", que nunca enviava a
    // chamada (o supabase só executa quando alguém espera o resultado) —
    // por isso os contadores de download/compartilhamento não eram gravados.
    supabase.rpc("registrar_evento_foto_romaria_plus", {
      p_compra_id: compraId,
      p_indice: indice,
      p_evento: evento,
    }).then(() => {});
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
    setEditandoFoto(false);
    const padraoTexto = AJUSTE_PADRAO[m];
    // Trocar de modelo só reseta a posição do PAINEL DE TEXTO para o padrão
    // daquele modelo — o reposicionamento/zoom da foto (fotoPos/fotoEscala)
    // é independente do modelo e continua do jeito que a pessoa deixou.
    const novoAjuste: AjusteOverlayRomariaPlus = padraoTexto
      ? {
          ...padraoTexto,
          fotoPos: ajuste.fotoPos,
          fotoEscala: ajuste.fotoEscala,
          frase: ajuste.frase,
          fraseCustom: ajuste.fraseCustom,
          transparencia: ajuste.transparencia,
          transparenciaTexto: ajuste.transparenciaTexto,
          estiloDesenho: ajuste.estiloDesenho,
          transparenciaDesenho: ajuste.transparenciaDesenho,
        }
      : ajuste;
    setAjuste(novoAjuste);
    if (fotoUrl) void persistirFoto(m, novoAjuste);
  }

  function centralizarAjuste() {
    const padrao = AJUSTE_PADRAO[modelo] ?? { x: 50, y: 80, escala: 100 };
    const novoAjuste = {
      ...padrao,
      fotoPos: ajuste.fotoPos,
      fotoEscala: ajuste.fotoEscala,
      frase: ajuste.frase,
      fraseCustom: ajuste.fraseCustom,
      transparencia: ajuste.transparencia,
      transparenciaTexto: ajuste.transparenciaTexto,
      estiloDesenho: ajuste.estiloDesenho,
      transparenciaDesenho: ajuste.transparenciaDesenho,
    };
    setAjuste(novoAjuste);
    void persistirFoto(modelo, novoAjuste);
  }

  // Frase do título (Rodada 28) — independente do modelo, igual ao ajuste
  // de foto/zoom, por isso persiste do mesmo jeito (sem resetar ao trocar
  // de modelo — ver escolherModelo/centralizarAjuste acima).
  function escolherFrase(f: FraseTitulo) {
    const novoAjuste = { ...ajuste, frase: f };
    setAjuste(novoAjuste);
    void persistirFoto(modelo, novoAjuste);
  }

  // Frase digitada livremente (Rodada 29, a pedido do usuário) — debounce
  // igual ao arraste de foto/texto, pra não mandar uma chamada ao servidor a
  // cada letra digitada.
  function digitarFraseCustom(texto: string) {
    const novoAjuste = { ...ajuste, frase: "personalizada" as FraseTitulo, fraseCustom: texto };
    setAjuste(novoAjuste);
    agendarPersistirAjuste(novoAjuste);
  }

  // Reposicionamento/zoom da FOTO (Rodada 23) — independente do painel de
  // texto acima, por isso tem seu próprio "centralizar" que não mexe em
  // x/y/escala do texto.
  function centralizarFoto() {
    const novoAjuste = { ...ajuste, fotoPos: FOTO_POS_PADRAO, fotoEscala: FOTO_ESCALA_PADRAO };
    setAjuste(novoAjuste);
    void persistirFoto(modelo, novoAjuste);
  }

  function moverFoto(delta: { dx: number; dy: number }) {
    setAjuste((atual) => {
      const posAtual = atual.fotoPos ?? FOTO_POS_PADRAO;
      // Arrastar para a direita/baixo revela mais do lado esquerdo/de cima
      // da foto original — por isso o delta é subtraído, não somado.
      return {
        ...atual,
        fotoPos: {
          x: Math.min(100, Math.max(0, posAtual.x - delta.dx)),
          y: Math.min(100, Math.max(0, posAtual.y - delta.dy)),
        },
      };
    });
  }

  function alternarEdicaoTexto() {
    setEditandoFoto(false);
    setEditando((v) => !v);
  }

  function alternarEdicaoFoto() {
    setEditando(false);
    setEditandoFoto((v) => !v);
  }

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setFinalizado(false);
    arquivoPendenteRef.current = arquivo;
    setFotoUrl((anterior) => {
      if (anterior?.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(arquivo);
    });
    // Uma foto nova começa sem zoom/deslocamento — o recorte de uma foto
    // anterior não faz sentido nenhum para a foto que acabou de entrar.
    const novoAjuste = { ...ajuste, fotoPos: FOTO_POS_PADRAO, fotoEscala: FOTO_ESCALA_PADRAO };
    setAjuste(novoAjuste);
    void persistirFoto(modelo, novoAjuste);
  }

  function trocarFoto() {
    setFinalizado(false);
    setEditando(false);
    setEditandoFoto(false);
    setFotoUrl((anterior) => {
      if (anterior?.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  function finalizarEdicao() {
    setEditando(false);
    setEditandoFoto(false);
    setFinalizado(true);
  }

  function editarNovamente() {
    setFinalizado(false);
  }

  // Espera cada <img> da arte terminar de carregar antes de capturar o PNG —
  // Rodada 23, corrige o bug relatado ("ao clicar em compartilhar antes de
  // baixar, ia só a arte sem a foto"): ao escolher uma foto nova e clicar
  // logo em seguida em Compartilhar (sem esperar nada), a tag <img> podia
  // ainda não ter terminado de carregar no DOM quando o html-to-image
  // percorria a árvore para gerar a imagem — resultando numa arte sem a
  // foto. Baixar "por acaso" costumava funcionar por vir depois de a pessoa
  // já ter olhado a prévia por alguns segundos, tempo suficiente para a foto
  // carregar. Agora os dois esperam pela foto de verdade antes de gerar.
  function aguardarImagem(img: HTMLImageElement): Promise<void> {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const finalizar = () => {
        img.removeEventListener("load", finalizar);
        img.removeEventListener("error", finalizar);
        resolve();
      };
      img.addEventListener("load", finalizar);
      img.addEventListener("error", finalizar);
      // Evita travar para sempre se por algum motivo a imagem nunca disparar
      // load/error (ex.: já removida do DOM entre o clique e esta checagem).
      setTimeout(finalizar, 5000);
    });
  }

  // Rodada 56 — captura com tamanho fixo (1080 px de largura, igual em
  // qualquer celular) e conferência de corte; ver src/lib/gerar-imagem.ts.
  async function gerarPng(): Promise<string | null> {
    if (!ref.current) return null;
    const imagens = Array.from(ref.current.querySelectorAll("img"));
    await Promise.all(imagens.map(aguardarImagem));
    const { gerarPngDoElemento } = await import("@/lib/gerar-imagem");
    return gerarPngDoElemento(ref.current, { larguraFinal: ARTE_LARGURA, alturaFinal: ARTE_ALTURA });
  }

  // Sai do modo de ajuste antes de gerar a imagem final, para a moldura
  // tracejada e os rótulos "arraste para mover"/"arraste a foto para
  // reposicionar" nunca aparecerem no PNG baixado/compartilhado — mesmo que
  // a pessoa tenha esquecido de concluir o ajuste antes de clicar em
  // baixar/compartilhar (na prática, com a Rodada 23, esses botões só ficam
  // visíveis antes de "Finalizar edição", mas o cuidado continua valendo).
  async function sairDoModoAjuste() {
    if (!editando && !editandoFoto) return;
    setEditando(false);
    setEditandoFoto(false);
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
      link.download = `romaria-plus-${c.codigo}-${indice}.png`;
      link.href = dataUrl;
      link.click();
      registrarEvento("download");
      await guardarArte(dataUrl, "download");
    } catch {
      setErro("Não foi possível gerar a arte agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  // Rodada 56 — depois do primeiro download/compartilhamento, a arte pronta
  // fica guardada (Migration 46): conta como 1 das fotos, não pode mais ser
  // editada, e a galeria passa para a próxima foto. Se falhar, a pessoa já
  // tem a imagem no celular; só avisa e deixa tentar de novo.
  async function guardarArte(dataUrl: string, evento: "download" | "compartilhamento") {
    setSalvandoArte(true);
    try {
      if (ajusteTimeoutRef.current) {
        clearTimeout(ajusteTimeoutRef.current);
        ajusteTimeoutRef.current = null;
      }
      await persistirFoto(modelo, ajuste);
      const url = await enviarArteParaStorage(`${userId}/${compraId}/arte-${indice}.png`, dataUrl);
      const supabase = createClient();
      const { error } = await supabase.rpc("salvar_arte_romaria_plus", {
        p_compra_id: compraId,
        p_indice: indice,
        p_arte_url: url,
      });
      if (error) throw error;
      onArteSalva?.({ indice, arte_url: url, evento });
    } catch {
      setAvisoSalvar(
        "A imagem foi gerada, mas não deu para guardá-la na sua galeria agora. Verifique a internet e toque em baixar ou compartilhar de novo."
      );
    } finally {
      setSalvandoArte(false);
    }
  }

  async function compartilhar() {
    setErro(null);
    setGerando("compartilhar");
    let dataUrlGerada: string | null = null;
    try {
      await sairDoModoAjuste();
      const dataUrl = await gerarPng();
      if (!dataUrl) throw new Error("sem arte");
      dataUrlGerada = dataUrl;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `romaria-plus-${c.codigo}-${indice}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: tituloTexto,
          text: "Minha peregrinação até Aparecida-SP!",
        });
      } else {
        const link = document.createElement("a");
        link.download = file.name;
        link.href = dataUrl;
        link.click();
      }
      registrarEvento("compartilhamento");
    } catch {
      // Cancelado pelo usuário ou sem suporte — sem problema.
      if (!dataUrlGerada) setErro("Não foi possível gerar a arte agora. Tente novamente.");
    }
    // Mesmo se a pessoa fechar a janela de compartilhar, a arte já gerada
    // fica guardada na galeria (pedido do usuário: "ao clicar em baixar ou
    // compartilhar essa imagem tem que ser salva").
    try {
      if (dataUrlGerada) await guardarArte(dataUrlGerada, "compartilhamento");
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

  // Rodada 49 — peças repetidas nos modelos novos.
  function cabecalho(escuro: boolean) {
    return (
      <div
        className={`absolute inset-x-0 top-0 z-[5] flex items-center justify-center gap-2 pt-[5%] ${escuro ? "text-amber-900" : "text-white"}`}
      >
        <Image
          src="/icons/logo-emblema.png"
          alt=""
          width={64}
          height={64}
          style={{ width: "9%", height: "auto" }}
          className={`rounded-lg ring-1 ${escuro ? "ring-amber-800/40" : "ring-white/40"}`}
        />
        <span className="font-semibold tracking-[0.15em]" style={{ fontSize: "2.6cqw" }}>
          O PEREGRINO
        </span>
      </div>
    );
  }

  function dadosLinha(tamanhoIcone: number) {
    return (
      <>
        {periodo && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CalendarDays size={tamanhoIcone} className="shrink-0" /> {periodo}
          </span>
        )}
        {tempo && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock size={tamanhoIcone} className="shrink-0" /> {tempo}
          </span>
        )}
        {distancia && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Route size={tamanhoIcone} className="shrink-0" /> {distancia}
          </span>
        )}
      </>
    );
  }

  // Carimbos da "Credencial": cada cidade com check-in, na ordem, sem
  // repetir, e sempre terminando em Aparecida (a chegada). Sem a lista
  // (certificado antigo), só a origem e Aparecida.
  // Rodada 54 — carimbo da ORIGEM (maior) + um carimbo para cada cidade
  // do caminho com check-in, na ordem, sem repetir + o de APARECIDA
  // (maior). Origem: a declarada no certificado/peregrinação; sem ela, a
  // primeira cidade com check-in.
  const normalizar = (cidade: string) =>
    cidade.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ehAparecida = (cidade: string) => normalizar(cidade) === "aparecida";
  const cidadesUnicas = (() => {
    const vistas = new Set<string>();
    const lista: string[] = [];
    for (const cidade of cidadesCheckin) {
      const chave = normalizar(cidade);
      if (!chave || vistas.has(chave) || ehAparecida(cidade)) continue;
      vistas.add(chave);
      lista.push(cidade);
    }
    return lista;
  })();
  const origemCarimbo =
    origem && !ehAparecida(origem) ? origem.trim() : (cidadesUnicas[0] ?? null);
  const carimbos = cidadesUnicas
    .filter((cidade) => !origemCarimbo || normalizar(cidade) !== normalizar(origemCarimbo))
    .slice(0, 15);
  // Rodada 60 — peregrinação longa (muitas cidades): carimbos menores e
  // nomes abreviados, para tudo caber na credencial.
  const muitasCidades = carimbos.length > 6;
  const larguraPassagem =
    carimbos.length <= 4 ? 23 : carimbos.length <= 6 ? 21 : carimbos.length <= 9 ? 17 : carimbos.length <= 12 ? 15 : 13;
  const larguraPonta = carimbos.length <= 6 ? 30 : carimbos.length <= 9 ? 26 : 23;
  const nomeCarimbo = (cidade: string) => (muitasCidades ? abreviarCidade(cidade) : cidade);
  const dataSaida = c.data_inicio ? formatarDataCurta(new Date(c.data_inicio)).slice(0, 5) : null;
  const dataChegada = c.data_fim ? formatarDataCurta(new Date(c.data_fim)).slice(0, 5) : String(ano);

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
          {/* Rodada 29: os seletores de modelo e de frase eram fileiras de
              botões (um por opção) — com 6 modelos e 6 frases isso ficava
              poluído e ocupava muito espaço vertical. A pedido do usuário,
              viraram duas listas suspensas ("cortina"), lado a lado. */}
          {!finalizado && (
            <div className="flex flex-wrap items-start justify-center gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="modelo-romaria-plus" className="text-xs font-medium text-neutral-500">
                  Modelo da arte
                </label>
                <select
                  id="modelo-romaria-plus"
                  value={modelo}
                  onChange={(e) => escolherModelo(e.target.value as Modelo)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  {MODELOS.filter((m) => !m.soAdmin || ehAdmin || m.id === modelo).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                      {m.soAdmin ? " (só admin)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="frase-romaria-plus" className="text-xs font-medium text-neutral-500">
                  Frase do título
                </label>
                <select
                  id="frase-romaria-plus"
                  value={ajuste.frase ?? "peregrinacao"}
                  onChange={(e) => escolherFrase(e.target.value as FraseTitulo)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  {FRASES_TITULO.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                {(ajuste.frase ?? "peregrinacao") === "personalizada" && (
                  <input
                    type="text"
                    value={ajuste.fraseCustom ?? ""}
                    onChange={(e) => digitarFraseCustom(e.target.value)}
                    maxLength={FRASE_CUSTOM_MAX}
                    placeholder="Digite sua frase"
                    className="mt-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                  />
                )}
              </div>
            </div>
          )}

          <div
            ref={ref}
            className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-lg"
            style={{ aspectRatio: `${ARTE_LARGURA} / ${ARTE_ALTURA}`, containerType: "inline-size" }}
          >
            {modelo === "classico" && (
              <>
                <FotoComPanZoom
                  src={fotoUrl}
                  fotoPos={fotoPos}
                  fotoEscala={fotoEscala}
                  editando={editandoFoto}
                  onArrastar={moverFoto}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
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
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(7.2), lineHeight: 1.05, textAlign: "center" }}>
                    {tituloTexto}
                  </p>
                  <p className="font-bold text-stripe-400" style={{ fontSize: "9cqw", textAlign: "center" }}>
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
                    {distancia && (
                      <span className="flex items-center gap-1">
                        <Route size={16} className="shrink-0" /> {distancia}
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
                <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.4), lineHeight: 1.15, textAlign: "center" }}>
                  {tituloTexto}
                </p>
                <p className="mb-[4%] font-bold text-stripe-400" style={{ fontSize: "8cqw", textAlign: "center" }}>
                  {ano}
                </p>
                <div className="relative w-[78%] overflow-hidden rounded-2xl ring-4 ring-white/30" style={{ aspectRatio: "1 / 1" }}>
                  <FotoComPanZoom
                    src={fotoUrl}
                    fotoPos={fotoPos}
                    fotoEscala={fotoEscala}
                    editando={editandoFoto}
                    onArrastar={moverFoto}
                    onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  />
                </div>
                {/* Trajeto do "Itinerário" (Rodada 27) repetido aqui, logo
                    abaixo da foto — a pedido do usuário na Rodada 29
                    ("o itinerário pode colocar também no modelo foto em
                    destaque, logo abaixo"). Mesma curva esquemática, só que
                    reduzida pra caber no espaço já ocupado pela foto/dados. */}
                <div className="mt-[2%] w-[85%]">
                  <TrajetoOrigemAparecida origem={nomeOrigem} tamanhoFonte="2.9cqw" />
                </div>
                <div
                  className="mt-[3%] flex w-full flex-col gap-[3%] rounded-xl bg-white/10 py-[4%] backdrop-blur-sm"
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
                    {distancia && (
                      <span className="flex items-center gap-1">
                        <Route size={16} className="shrink-0" /> {distancia}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex w-full items-center justify-center gap-[10%] pt-[4%]">{simbolos}</div>
              </div>
            )}

            {modelo === "painel" && (
              <>
                <FotoComPanZoom
                  src={fotoUrl}
                  fotoPos={fotoPos}
                  fotoEscala={fotoEscala}
                  editando={editandoFoto}
                  onArrastar={moverFoto}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                />
                {/* Vinheta bem sutil, só para garantir contraste nas bordas —
                    diferente do "Clássico", a foto fica quase inteira à
                    vista, sem escurecer o centro da imagem. */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />
                {/* Rodada 30: "O Peregrino apresenta" tirado daqui — a pedido
                    do usuário, todos os modelos usam a mesma barra fixa "O
                    PEREGRINO" + símbolo do app no topo, como classico/
                    destaque/itinerario já tinham. */}
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
                  className="w-[82%] rounded-3xl bg-gradient-to-br from-amber-900/95 via-amber-950/95 to-neutral-900/95 px-[6%] py-[5%] text-center text-white shadow-2xl ring-1 ring-white/25"
                >
                  <p
                    className="mt-[1%]"
                    style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.6), lineHeight: 1.05, textAlign: "center" }}
                  >
                    {tituloTexto}
                  </p>
                  <p className="mt-[2%] font-bold text-stripe-400" style={{ fontSize: "8.4cqw", textAlign: "center" }}>
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
                    {distancia && (
                      <span className="flex items-center gap-1">
                        <Route size={16} className="shrink-0" /> {distancia}
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
                      <FotoComPanZoom
                        src={fotoUrl}
                        fotoPos={fotoPos}
                        fotoEscala={fotoEscala}
                        editando={editandoFoto}
                        onArrastar={moverFoto}
                        onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                      />
                    </div>
                    <div className="mt-[4%] flex flex-col items-center gap-[2%] text-center text-amber-900">
                      <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(5.4), lineHeight: 1.1, textAlign: "center" }}>
                        {tituloTexto}
                      </p>
                      <p className="font-bold text-amber-700" style={{ fontSize: "6.2cqw", textAlign: "center" }}>
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
                        {distancia && (
                          <span className="flex items-center gap-1">
                            <Route size={13} className="shrink-0" /> {distancia}
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

            {/* "Itinerário" (Rodada 27) — a foto ocupa o quadro inteiro, e um
                gráfico do trajeto (linha pontilhada + os dois marcadores,
                origem e Aparecida-SP) fica desenhado por cima dela, bem
                transparente, para não esconder a foto por baixo — como
                pedido pelo usuário ("meio transparente com os dados da
                peregrinação para sobrepor a foto"). É um traçado
                estilizado/esquemático (não um mapa real com tiles), pensado
                especificamente para nunca falhar ao gerar a imagem, diferente
                de um mapa de verdade. */}
            {modelo === "itinerario" && (
              <>
                <FotoComPanZoom
                  src={fotoUrl}
                  fotoPos={fotoPos}
                  fotoEscala={fotoEscala}
                  editando={editandoFoto}
                  onArrastar={moverFoto}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/50 pointer-events-none" />
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
                {/* Rodada 30: título, trajeto e dados agora são UM bloco só,
                    dentro do mesmo PainelAjustavel de classico/painel — a
                    pedido do usuário ("o itinerário também tem que poder ser
                    movimentado e redimensionado"). Antes eram 3 blocos com
                    posição fixa (top-13%/bottom-30%/bottom-10%), sem nenhum
                    jeito de ajustar. */}
                <PainelAjustavel
                  ajuste={ajuste}
                  editando={editando}
                  containerRef={ref}
                  onArrastar={setAjuste}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  className="flex w-[84%] flex-col items-center gap-[4%] text-center text-white"
                >
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.6), lineHeight: 1.05, textAlign: "center" }}>
                    {tituloTexto}
                  </p>
                  <p className="font-bold text-stripe-400" style={{ fontSize: "8cqw", textAlign: "center" }}>
                    {ano}
                  </p>
                  {/* O trajeto em si: uma curva pontilhada (Rodada 28 — o
                      usuário achou a linha reta anterior "muito ruim") ligando
                      um marcador de origem a um de chegada, desenhada com
                      baixa opacidade — dá para ver a foto por trás dela o
                      tempo todo. Ainda esquemática (sem dados reais de mapa),
                      só com uma curva suave em vez de uma diagonal reta. */}
                  <TrajetoOrigemAparecida origem={nomeOrigem} tamanhoFonte="3.2cqw" />
                  <div
                    className="flex w-full items-center justify-center gap-[6%] rounded-xl bg-black/45 py-[3%] text-white backdrop-blur-sm"
                    style={{ fontSize: "3.2cqw" }}
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
                    {distancia && (
                      <span className="flex items-center gap-1">
                        <Route size={16} className="shrink-0" /> {distancia}
                      </span>
                    )}
                  </div>
                </PainelAjustavel>
              </>
            )}

            {/* "Selo de conquista" (Rodada 27) — inspirado nos cartões de
                "medalha de chegada" de apps de corrida: a foto ao fundo, bem
                escurecida, com um selo circular dourado no centro (emblema do
                app + faixa "CONCLUÍDO") — o objetivo é a sensação de
                conquista/fé pedida, um troféu mais do que um dado técnico. */}
            {modelo === "selo" && (
              <div className="absolute inset-0 flex flex-col items-center bg-neutral-950">
                <FotoComPanZoom
                  src={fotoUrl}
                  fotoPos={fotoPos}
                  fotoEscala={fotoEscala}
                  editando={editandoFoto}
                  onArrastar={moverFoto}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  imgOpacidade={fotoOpacidadeSelo}
                />
                {/* Antes fixo (from-black/70 via-black/40 to-black/80) — Rodada
                    30: intensidade agora controlada pelo slider de
                    transparência (fatorEscuridaoSelo), a pedido do usuário
                    ("tem que... deixar mais transparente"). */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,${0.7 * fatorEscuridaoSelo}) 0%, rgba(0,0,0,${0.4 * fatorEscuridaoSelo}) 45%, rgba(0,0,0,${0.8 * fatorEscuridaoSelo}) 100%)`,
                  }}
                />
                {/* Rodada 30: barra fixa "O PEREGRINO" + símbolo, igual aos
                    outros modelos, no lugar do texto "O Peregrino apresenta"
                    que ficava dentro do bloco móvel abaixo. */}
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
                {/* Medalha + título + dados agora são um bloco só, dentro do
                    mesmo PainelAjustavel de classico/painel/itinerario
                    (Rodada 30 — "não tem condições do selo ficar assim, tem
                    que ter como movimentar e dimensionar"). O
                    pointer-events-none que soltava o bloco antigo fixo agora
                    é tratado dentro do próprio PainelAjustavel (só ativo
                    enquanto "editando" está true), então não precisa mais
                    ser feito manualmente aqui. */}
                <PainelAjustavel
                  ajuste={ajuste}
                  editando={editando}
                  containerRef={ref}
                  onArrastar={setAjuste}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  className="flex w-[84%] flex-col items-center gap-[4%] px-[4%] text-center text-white"
                >
                  <div className="relative flex items-center justify-center" style={{ width: "48%", aspectRatio: "1 / 1" }}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-stripe-300 via-amber-500 to-amber-700 shadow-2xl" />
                    <div className="absolute inset-[6%] rounded-full border-2 border-white/70" />
                    <div className="absolute inset-[10%] flex flex-col items-center justify-center gap-[6%] rounded-full bg-gradient-to-br from-amber-800 to-amber-950 text-white">
                      <Medal size={28} style={{ width: "22%", height: "22%" }} />
                      <span className="font-bold tracking-[0.1em]" style={{ fontSize: "5.5cqw" }}>
                        CONCLUÍDO
                      </span>
                      <span className="font-bold text-stripe-400" style={{ fontSize: "7.5cqw" }}>
                        {ano}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.4), lineHeight: 1.1, textAlign: "center" }}>
                    {tituloTexto}
                  </p>
                  <div
                    className="flex items-center justify-center gap-[6%] rounded-xl bg-white/10 px-[4%] py-[3%] backdrop-blur-sm"
                    style={{ fontSize: "3.2cqw" }}
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
                    {distancia && (
                      <span className="flex items-center gap-1">
                        <Route size={16} className="shrink-0" /> {distancia}
                      </span>
                    )}
                  </div>
                </PainelAjustavel>
              </div>
            )}

            {/* "Basílica de Aparecida" (Rodada 49) — a foto inteira ao fundo e,
                por cima, um bloco móvel/redimensionável com a silhueta
                dourada da Basílica, o título e os dados. */}
            {modelo === "basilica" && (
              <>
                <FotoComPanZoom
                  src={fotoUrl}
                  fotoPos={fotoPos}
                  fotoEscala={fotoEscala}
                  editando={editandoFoto}
                  onArrastar={moverFoto}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(11,26,61,${0.92 * fatorEscuridaoBasilica}) 0%, rgba(11,26,61,${0.62 * fatorEscuridaoBasilica}) 38%, rgba(0,0,0,${0.12 * fatorEscuridaoBasilica}) 62%, rgba(0,0,0,${0.45 * fatorEscuridaoBasilica}) 100%)`,
                  }}
                />
                {cabecalho(false)}
                <PainelAjustavel
                  ajuste={ajuste}
                  editando={editando}
                  containerRef={ref}
                  onArrastar={setAjuste}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  className="flex w-[94%] flex-col items-center gap-[2.5%] text-center text-white"
                  transparenciaNoPainel={false}
                >
                  <div className="w-full" style={{ opacity: opacidadeDesenho }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={estiloDesenho === "foto" ? "/arte/basilica-foto.webp" : `/arte/basilica-desenho-${estiloDesenho}.webp`}
                      alt="Basílica de Nossa Senhora Aparecida"
                      className="block w-full"
                      style={estiloDesenho === "claro" ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))" } : undefined}
                      draggable={false}
                    />
                  </div>
                  <div
                    className="flex w-full flex-col items-center gap-[1.2cqw]"
                    style={{ opacity: 1 - Math.min(70, Math.max(0, ajuste.transparenciaTexto ?? 0)) / 100 }}
                  >
                    <div className="h-[2px] w-[70%] bg-gradient-to-r from-transparent via-stripe-400 to-transparent" />
                    <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.6), lineHeight: 1.05, textAlign: "center" }}>
                      {tituloTexto}
                    </p>
                    <p className="font-bold text-stripe-400" style={{ fontSize: "8cqw", textAlign: "center" }}>
                      {ano}
                    </p>
                    <p className="font-semibold text-white/90" style={{ fontSize: "3.1cqw", textAlign: "center" }}>
                      De {nomeOrigem} à Basílica de Aparecida
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-[6%] gap-y-1" style={{ fontSize: "3.1cqw" }}>
                      {dadosLinha(15)}
                    </div>
                  </div>
                </PainelAjustavel>
              </>
            )}

            {/* "Nossa Senhora Aparecida" (Rodada 57) — igual à Basílica, com o
                desenho da Santa enviado pelo usuário. */}
            {modelo === "santa" && (
              <>
                <FotoComPanZoom
                  src={fotoUrl}
                  fotoPos={fotoPos}
                  fotoEscala={fotoEscala}
                  editando={editandoFoto}
                  onArrastar={moverFoto}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(11,26,61,${0.92 * fatorEscuridaoBasilica}) 0%, rgba(11,26,61,${0.62 * fatorEscuridaoBasilica}) 38%, rgba(0,0,0,${0.12 * fatorEscuridaoBasilica}) 62%, rgba(0,0,0,${0.45 * fatorEscuridaoBasilica}) 100%)`,
                  }}
                />
                {cabecalho(false)}
                <PainelAjustavel
                  ajuste={ajuste}
                  editando={editando}
                  containerRef={ref}
                  onArrastar={setAjuste}
                  onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                  className="flex w-[90%] flex-col items-center gap-[2.5%] text-center text-white"
                  transparenciaNoPainel={false}
                >
                  <div className="w-[74%]" style={{ opacity: opacidadeDesenho }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={estiloDesenho === "foto" ? "/arte/santa-colorida.webp" : `/arte/santa-desenho-${estiloDesenho}.webp`}
                      alt="Nossa Senhora Aparecida"
                      className="block w-full"
                      style={estiloDesenho === "claro" ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))" } : undefined}
                      draggable={false}
                    />
                  </div>
                  <div
                    className="flex w-full flex-col items-center gap-[1.2cqw]"
                    style={{ opacity: 1 - Math.min(70, Math.max(0, ajuste.transparenciaTexto ?? 0)) / 100 }}
                  >
                    <div className="h-[2px] w-[70%] bg-gradient-to-r from-transparent via-stripe-400 to-transparent" />
                    <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.6), lineHeight: 1.05, textAlign: "center" }}>
                      {tituloTexto}
                    </p>
                    <p className="font-bold text-stripe-400" style={{ fontSize: "8cqw", textAlign: "center" }}>
                      {ano}
                    </p>
                    <p className="font-semibold text-white/90" style={{ fontSize: "3.1cqw", textAlign: "center" }}>
                      De {nomeOrigem} a Aparecida-SP
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-[6%] gap-y-1" style={{ fontSize: "3.1cqw" }}>
                      {dadosLinha(15)}
                    </div>
                  </div>
                </PainelAjustavel>
              </>
            )}

            {/* "Terço" (Rodada 49) — a foto num círculo no centro, rodeada
                por um terço dourado (5 dezenas, medalha e cruz), sobre o azul
                do manto de Nossa Senhora. */}
            {modelo === "terco" && (
              <div
                className="absolute inset-0 flex flex-col items-center pt-[15%] pb-[4%] text-center text-white"
                style={{
                  background: `${FUNDO_VEIOS_MADEIRA}, linear-gradient(180deg, #7a4a24 0%, #5c3518 60%, #3f230e 100%)`,
                }}
              >
                {cabecalho(false)}
                <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.2), lineHeight: 1.08, textAlign: "center", textShadow: "0 2px 6px rgba(0,0,0,.45)" }}>
                  {tituloTexto}
                </p>
                <p className="font-bold text-stripe-400" style={{ fontSize: "7cqw", textAlign: "center", textShadow: "0 2px 6px rgba(0,0,0,.45)" }}>
                  {ano}
                </p>
                <div
                  className="relative mt-[2%] w-[90%] shadow-2xl"
                  style={{ aspectRatio: `${TERCO_IMG.largura} / ${TERCO_IMG.altura}` }}
                >
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: `${(TERCO_IMG.x0 / TERCO_IMG.largura) * 100}%`,
                      top: `${(TERCO_IMG.y0 / TERCO_IMG.altura) * 100}%`,
                      width: `${((TERCO_IMG.x1 - TERCO_IMG.x0) / TERCO_IMG.largura) * 100}%`,
                      height: `${((TERCO_IMG.y1 - TERCO_IMG.y0) / TERCO_IMG.altura) * 100}%`,
                      borderRadius: `${(TERCO_IMG.canto / (TERCO_IMG.x1 - TERCO_IMG.x0)) * 100}% / ${(TERCO_IMG.canto / (TERCO_IMG.y1 - TERCO_IMG.y0)) * 100}%`,
                    }}
                  >
                    <FotoComPanZoom
                      src={fotoUrl}
                      fotoPos={fotoPos}
                      fotoEscala={fotoEscala}
                      editando={editandoFoto}
                      onArrastar={moverFoto}
                      onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                    />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/arte/terco-madeira.webp"
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    draggable={false}
                  />
                </div>
                <p className="mt-[3%] font-semibold text-white/95" style={{ fontSize: "3.1cqw", textAlign: "center" }}>
                  De {nomeOrigem} a Aparecida-SP
                </p>
                <div
                  className="mt-[1.5%] flex flex-wrap items-center justify-center gap-x-[6%] gap-y-1 text-stripe-200"
                  style={{ fontSize: "3cqw" }}
                >
                  {dadosLinha(14)}
                </div>
              </div>
            )}

            {/* "Cartão-postal" (Rodada 49) — borda de correio aéreo, a foto
                como um retrato de papel levemente inclinado, carimbo dos
                correios de Aparecida por cima e o selo com a Basílica. */}
            {modelo === "postal" && (
              <div
                className="absolute inset-0 p-[3%]"
                style={{
                  background: FUNDO_LISTRAS_CORREIO,
                }}
              >
                <div className="relative flex h-full w-full flex-col items-center px-[5%] pt-[14%] pb-[5%]" style={{ background: "#f3e9d2" }}>
                  {cabecalho(true)}
                  <div className="relative w-[88%] bg-white p-[3%] pb-[9%] shadow-xl" style={{ transform: "rotate(-2.5deg)" }}>
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "5 / 6" }}>
                      <FotoComPanZoom
                        src={fotoUrl}
                        fotoPos={fotoPos}
                        fotoEscala={fotoEscala}
                        editando={editandoFoto}
                        onArrastar={moverFoto}
                        onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                      />
                    </div>
                    <p
                      className="absolute inset-x-0 bottom-[1.5%] text-neutral-700"
                      style={{ fontFamily: FONTE_TITULO, fontStyle: "italic", fontSize: "3.6cqw", textAlign: "center" }}
                    >
                      Lembrança de Aparecida, {ano}
                    </p>
                    {/* carimbo dos correios sobre o canto da foto */}
                    <div className="pointer-events-none absolute -right-[7%] -top-[5%] z-[11] w-[36%]" style={{ transform: "rotate(12deg)" }}>
                      <svg viewBox="0 0 120 80" className="w-full" aria-hidden="true">
                        <g fill="none" stroke="#1e3a8a" strokeOpacity="0.8">
                          <circle cx="40" cy="40" r="34" strokeWidth="2.4" />
                          <circle cx="40" cy="40" r="27" strokeWidth="1.2" />
                          <path d="M78,26 q8,-6 16,0 t16,0" strokeWidth="2" />
                          <path d="M78,40 q8,-6 16,0 t16,0" strokeWidth="2" />
                          <path d="M78,54 q8,-6 16,0 t16,0" strokeWidth="2" />
                        </g>
                        <g fill="#1e3a8a" fillOpacity="0.85" fontFamily="sans-serif" textAnchor="middle">
                          <text x="40" y="31" fontSize="7" fontWeight="700">APARECIDA</text>
                          <text x="40" y="44" fontSize="9" fontWeight="800">{dataChegada}</text>
                          <text x="40" y="56" fontSize="7" fontWeight="700">SP · {ano}</text>
                        </g>
                      </svg>
                    </div>
                  </div>
                  <div className="mt-[4%] flex w-full flex-1 items-center gap-[4%]">
                    <div className="flex min-w-0 flex-1 flex-col gap-[5%] text-amber-950" style={{ textAlign: "left" }}>
                      <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(6.2), lineHeight: 1.1, textAlign: "left" }}>
                        {tituloTexto}
                      </p>
                      <p className="border-b border-amber-900/30 pb-[2%]" style={{ fontSize: "3.6cqw", textAlign: "left" }}>
                        <span className="font-bold">De:</span> {nomeOrigem}
                      </p>
                      <p className="border-b border-amber-900/30 pb-[2%]" style={{ fontSize: "3.6cqw", textAlign: "left" }}>
                        <span className="font-bold">Para:</span> Aparecida-SP
                      </p>
                      <div className="flex flex-wrap gap-x-[6%] gap-y-1 text-amber-900" style={{ fontSize: "3cqw" }}>
                        {dadosLinha(13)}
                      </div>
                    </div>
                    <div className="w-[30%] shrink-0" style={{ transform: "rotate(3deg)" }}>
                      <SeloPostal ano={ano} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* "Credencial do peregrino" (Rodada 49) — como a credencial dos
                caminhos de peregrinação: foto 3x4, dados da caminhada e um
                carimbo para cada cidade onde houve check-in, até a chegada em
                Aparecida. */}
            {modelo === "credencial" && (
              <div className="absolute inset-0 p-[3%]" style={{ background: "#7c2d12" }}>
                <div
                  className="relative flex h-full w-full flex-col items-center px-[5%] pt-[14%] pb-[4%] text-amber-950"
                  style={{ background: "linear-gradient(180deg, #f7eed8 0%, #efe2c2 100%)", boxShadow: "inset 0 0 0 0.6cqw #b45309" }}
                >
                  {cabecalho(true)}
                  <p className="font-bold tracking-[0.25em] text-amber-800" style={{ fontSize: "2.6cqw", textAlign: "center" }}>
                    CREDENCIAL DO PEREGRINO
                  </p>
                  <p className="mt-[1%]" style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: fonteTitulo(5.4), lineHeight: 1.1, textAlign: "center" }}>
                    {tituloTexto} <span className="text-amber-700">{ano}</span>
                  </p>
                  <div className="mt-[3%] flex w-full items-stretch gap-[4%]">
                    <div className="relative w-[46%] shrink-0 overflow-hidden rounded-md ring-2 ring-amber-800/60" style={{ aspectRatio: "3 / 4" }}>
                      <FotoComPanZoom
                        src={fotoUrl}
                        fotoPos={fotoPos}
                        fotoEscala={fotoEscala}
                        editando={editandoFoto}
                        onArrastar={moverFoto}
                        onSoltarArraste={() => agendarPersistirAjuste(ajuste)}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-[5%]" style={{ fontSize: "3.1cqw", textAlign: "left" }}>
                      <div>
                        <p className="font-bold uppercase text-amber-800" style={{ fontSize: "2.2cqw", textAlign: "left" }}>Peregrino(a)</p>
                        <p className="font-bold leading-tight" style={{ textAlign: "left" }}>{c.nome_peregrino}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase text-amber-800" style={{ fontSize: "2.2cqw", textAlign: "left" }}>Caminho</p>
                        <p className="leading-tight" style={{ textAlign: "left" }}>{nomeOrigem} → Aparecida-SP</p>
                      </div>
                      <div className="flex flex-col gap-1">{dadosLinha(12)}</div>
                    </div>
                  </div>
                  {/* Origem e Aparecida maiores; as cidades do caminho, menores,
                      entre as duas. */}
                  <div className="flex w-full flex-1 flex-wrap content-center items-center justify-center gap-x-[3%] gap-y-[2.5%] py-[3%]">
                    {origemCarimbo && (
                      <Carimbo
                        cidade={nomeCarimbo(origemCarimbo)}
                        rotulo={dataSaida ? `Origem ${dataSaida}` : "Origem"}
                        indice={0}
                        largura={larguraPonta}
                      />
                    )}
                    {carimbos.map((cidade, i) => (
                      <Carimbo key={cidade + i} cidade={nomeCarimbo(cidade)} rotulo="Passagem" indice={i + 1} largura={larguraPassagem} />
                    ))}
                    <Carimbo
                      cidade="Aparecida"
                      rotulo={`Chegada ${dataChegada}`}
                      indice={carimbos.length + 1}
                      destaque
                      largura={larguraPonta}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!finalizado && (
            <>
              {/* Ajuste da FOTO em si (zoom + reposicionar dentro do recorte)
                  — Rodada 23, disponível nos 4 modelos, já que todos recortam
                  a foto para caber no espaço reservado a ela. */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={alternarEdicaoFoto}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    editandoFoto
                      ? "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                  }`}
                >
                  <ZoomIn size={14} /> {editandoFoto ? "Concluir ajuste" : "Ajustar posição da foto"}
                </button>
                {editandoFoto && (
                  <div className="flex w-full max-w-xs flex-col items-center gap-1.5">
                    <p className="text-center text-xs text-neutral-500">
                      Arraste a foto na prévia acima para não cortar a parte que você quer mostrar.
                    </p>
                    <label htmlFor="zoom-foto-romaria" className="text-xs font-medium text-neutral-500">
                      Zoom da foto
                    </label>
                    <input
                      id="zoom-foto-romaria"
                      type="range"
                      min={100}
                      max={200}
                      step={5}
                      value={fotoEscala}
                      onChange={(e) => {
                        const novo = { ...ajuste, fotoEscala: Number(e.target.value) };
                        setAjuste(novo);
                        agendarPersistirAjuste(novo);
                      }}
                      className="w-full accent-amber-700"
                    />
                    <button
                      type="button"
                      onClick={centralizarFoto}
                      className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-500"
                    >
                      Centralizar de novo
                    </button>
                    {/* Transparência do fundo (Rodada 30, só no "Selo de
                        conquista" — a pedido do usuário: "tem que...
                        deixar mais transparente"). */}
                    {(modelo === "basilica" || modelo === "santa") && (
                      <>
                        <label htmlFor="transparencia-fundo-basilica" className="mt-1 text-xs font-medium text-neutral-500">
                          Transparência do fundo
                        </label>
                        <input
                          id="transparencia-fundo-basilica"
                          type="range"
                          min={0}
                          max={100}
                          step={10}
                          value={transparenciaFundoBasilica}
                          onChange={(e) => {
                            const novo = { ...ajuste, transparencia: Number(e.target.value) };
                            setAjuste(novo);
                            agendarPersistirAjuste(novo);
                          }}
                          className="w-full accent-amber-700"
                        />
                      </>
                    )}
                    {modelo === "selo" && (
                      <>
                        <label htmlFor="transparencia-selo-romaria" className="mt-1 text-xs font-medium text-neutral-500">
                          Transparência do fundo
                        </label>
                        <input
                          id="transparencia-selo-romaria"
                          type="range"
                          min={0}
                          max={100}
                          step={10}
                          value={transparenciaSelo}
                          onChange={(e) => {
                            const novo = { ...ajuste, transparencia: Number(e.target.value) };
                            setAjuste(novo);
                            agendarPersistirAjuste(novo);
                          }}
                          className="w-full accent-amber-700"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {infoModelo.temAjuste && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={alternarEdicaoTexto}
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
                      {(modelo === "basilica" || modelo === "santa") && (
                        <>
                          <label htmlFor="estilo-desenho-basilica" className="mt-1 text-xs font-medium text-neutral-500">
                            {modelo === "santa" ? "Desenho de Nossa Senhora" : "Desenho da Basílica"}
                          </label>
                          <select
                            id="estilo-desenho-basilica"
                            value={estiloDesenho}
                            onChange={(e) => {
                              const novo = { ...ajuste, estiloDesenho: e.target.value as EstiloDesenho };
                              setAjuste(novo);
                              void persistirFoto(modelo, novo);
                            }}
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                          >
                            {(modelo === "santa" ? ESTILOS_SANTA : ESTILOS_DESENHO).map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.nome}
                              </option>
                            ))}
                          </select>
                          <label htmlFor="transparencia-desenho-basilica" className="mt-1 text-xs font-medium text-neutral-500">
                            Transparência do desenho
                          </label>
                          <input
                            id="transparencia-desenho-basilica"
                            type="range"
                            min={0}
                            max={80}
                            step={5}
                            value={ajuste.transparenciaDesenho ?? 0}
                            onChange={(e) => {
                              const novo = { ...ajuste, transparenciaDesenho: Number(e.target.value) };
                              setAjuste(novo);
                              agendarPersistirAjuste(novo);
                            }}
                            className="w-full accent-amber-700"
                          />
                        </>
                      )}
                      <label htmlFor="transparencia-texto-romaria" className="mt-1 text-xs font-medium text-neutral-500">
                        Transparência do texto
                      </label>
                      <input
                        id="transparencia-texto-romaria"
                        type="range"
                        min={0}
                        max={70}
                        step={5}
                        value={ajuste.transparenciaTexto ?? 0}
                        onChange={(e) => {
                          const novo = { ...ajuste, transparenciaTexto: Number(e.target.value) };
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

              {/* Rodada 23: antes dava para baixar/compartilhar a qualquer
                  momento; agora é preciso escolher entre trocar de foto ou
                  confirmar que terminou de editar — só depois disso aparecem
                  os botões de baixar/compartilhar (ver bloco "finalizado"
                  abaixo), evitando editar sem perceber depois de já ter
                  baixado/compartilhado a arte. */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={trocarFoto}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Trocar foto
                </button>
                <button onClick={finalizarEdicao} className="btn-primary flex items-center gap-2">
                  <Check size={16} /> Finalizar edição
                </button>
              </div>
            </>
          )}

          {finalizado && (
            <div className="flex flex-col items-center gap-2">
              <p
                className="max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                style={{ textAlign: "center" }}
              >
                Ao baixar ou compartilhar, esta arte fica <strong>guardada na sua galeria como Foto {indice}</strong>{" "}
                (para baixar de novo quando quiser) e não pode mais ser editada.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={compartilhar}
                  disabled={gerando !== null}
                  className="btn-primary flex items-center gap-2"
                >
                  <Share2 size={16} />{" "}
                  {gerando === "compartilhar" ? (salvandoArte ? "Salvando..." : "Gerando...") : "Compartilhar"}
                </button>
                <button
                  onClick={baixar}
                  disabled={gerando !== null}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download size={16} />{" "}
                  {gerando === "baixar" ? (salvandoArte ? "Salvando..." : "Gerando...") : "Baixar imagem"}
                </button>
                <button
                  onClick={editarNovamente}
                  disabled={gerando !== null}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Pencil size={16} /> Editar novamente
                </button>
              </div>
              {(contadorDownloads > 0 || contadorCompartilhamentos > 0) && (
                <p className="text-xs text-neutral-400">
                  {contadorDownloads > 0 && `Baixada ${contadorDownloads}x`}
                  {contadorDownloads > 0 && contadorCompartilhamentos > 0 && " · "}
                  {contadorCompartilhamentos > 0 && `Compartilhada ${contadorCompartilhamentos}x`}
                </p>
              )}
              <p className="flex items-center gap-1 text-xs text-neutral-400">
                <Sparkle size={12} className="shrink-0" /> Dica: o modelo &quot;Moldura dourada&quot; nunca cobre a
                foto — o texto sempre fica numa área própria.
              </p>
            </div>
          )}
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {avisoSalvar && <p className="max-w-xs text-center text-xs text-amber-700 dark:text-amber-500">{avisoSalvar}</p>}
        </>
      )}
    </div>
  );
}
