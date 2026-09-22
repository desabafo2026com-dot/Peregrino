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

export type Modelo = "classico" | "destaque" | "painel" | "moldura" | "itinerario" | "selo";

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
const MODELOS: { id: Modelo; nome: string; temAjuste: boolean }[] = [
  { id: "classico", nome: "Clássico", temAjuste: true },
  { id: "destaque", nome: "Foto em destaque", temAjuste: false },
  { id: "painel", nome: "Painel flutuante", temAjuste: true },
  { id: "moldura", nome: "Moldura dourada", temAjuste: false },
  { id: "itinerario", nome: "Itinerário", temAjuste: false },
  { id: "selo", nome: "Selo de conquista", temAjuste: false },
];

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
  itinerario: null,
  selo: null,
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
}: {
  src: string;
  fotoPos: { x: number; y: number };
  fotoEscala: number;
  editando: boolean;
  onArrastar: (delta: { dx: number; dy: number }) => void;
  onSoltarArraste: () => void;
  className?: string;
  imgClassName?: string;
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
        />
      )}
      <FotoAjustavel editando={editando} onArrastar={onArrastar} onSoltarArraste={onSoltarArraste} />
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
  onSalvo?: (dados: { indice: number; foto_url: string; modelo: Modelo; ajuste_overlay: AjusteOverlayRomariaPlus | null }) => void;
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
  onSalvo,
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
  // Frase do título escolhida (ver FRASES_TITULO acima) — guardada dentro do
  // próprio ajuste, igual a fotoPos/fotoEscala, independente do modelo. Na
  // opção "personalizada" o texto de verdade vem de ajuste.fraseCustom (com
  // uma frase padrão de reserva caso a pessoa ainda não tenha digitado nada).
  const fraseSelecionada =
    FRASES_TITULO.find((f) => f.id === (ajuste.frase ?? "peregrinacao")) ?? FRASES_TITULO[0];
  const tituloTexto =
    fraseSelecionada.texto ?? (ajuste.fraseCustom?.trim() || FRASES_TITULO[0].texto!);

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
    void supabase.rpc("registrar_evento_foto_romaria_plus", {
      p_compra_id: compraId,
      p_indice: indice,
      p_evento: evento,
    });
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

  async function gerarPng(): Promise<string | null> {
    if (!ref.current) return null;
    const imagens = Array.from(ref.current.querySelectorAll("img"));
    await Promise.all(imagens.map(aguardarImagem));
    const { toPng } = await import("html-to-image");
    return toPng(ref.current, { pixelRatio: 2 });
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
                  {MODELOS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
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
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "7.2cqw", lineHeight: 1.05, textAlign: "center" }}>
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
                <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "6.4cqw", lineHeight: 1.15, textAlign: "center" }}>
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
                <div className="mt-[3%] w-[85%] text-white/85">
                  <svg viewBox="0 0 100 22" className="w-full" style={{ opacity: 0.85 }}>
                    <path
                      d="M8,17 C32,20 40,3 60,6 C74,8 80,2 92,5"
                      fill="none"
                      stroke="white"
                      strokeOpacity="0.65"
                      strokeWidth="1.6"
                      strokeDasharray="3,3.2"
                      strokeLinecap="round"
                    />
                    <circle cx="8" cy="17" r="3.2" fill="white" fillOpacity="0.9" />
                    <circle cx="92" cy="5" r="3.6" fill="#fbbf24" fillOpacity="0.95" />
                  </svg>
                  <div className="mt-[1%] flex items-start justify-between" style={{ fontSize: "2.6cqw" }}>
                    <span className="flex max-w-[45%] items-center gap-1 text-left">
                      <Footprints size={13} className="mt-0.5 shrink-0" /> {origem ?? "Início"}
                    </span>
                    <span className="flex max-w-[45%] items-center gap-1 text-right text-stripe-400">
                      <Church size={13} className="mt-0.5 shrink-0" /> Aparecida-SP
                    </span>
                  </div>
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
                      <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "5.4cqw", lineHeight: 1.1, textAlign: "center" }}>
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
                <div className="absolute inset-x-0 top-[13%] flex flex-col items-center text-center text-white">
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "6.6cqw", lineHeight: 1.05, textAlign: "center" }}>
                    {tituloTexto}
                  </p>
                  <p className="font-bold text-stripe-400" style={{ fontSize: "8cqw", textAlign: "center" }}>
                    {ano}
                  </p>
                </div>
                {/* O trajeto em si: uma curva pontilhada (Rodada 28 — o
                    usuário achou a linha reta anterior "muito ruim") ligando
                    um marcador de origem a um de chegada, desenhada com
                    baixa opacidade — dá para ver a foto por trás dela o
                    tempo todo. Ainda esquemática (sem dados reais de mapa),
                    só com uma curva suave em vez de uma diagonal reta. */}
                <div className="absolute inset-x-[8%] bottom-[30%] text-white/85">
                  <svg viewBox="0 0 100 26" className="w-full" style={{ opacity: 0.8 }}>
                    <path
                      d="M8,20 C32,23 40,4 60,7 C74,9 80,3 92,6"
                      fill="none"
                      stroke="white"
                      strokeOpacity="0.65"
                      strokeWidth="1.4"
                      strokeDasharray="3,3.2"
                      strokeLinecap="round"
                    />
                    <circle cx="8" cy="20" r="3" fill="white" fillOpacity="0.9" />
                    <circle cx="92" cy="6" r="3.4" fill="#fbbf24" fillOpacity="0.95" />
                  </svg>
                  <div className="mt-[1%] flex items-start justify-between" style={{ fontSize: "2.9cqw" }}>
                    <span className="flex max-w-[45%] items-center gap-1 text-left">
                      <Footprints size={14} className="mt-0.5 shrink-0" />
                      {origem ?? "Início"}
                    </span>
                    <span className="flex max-w-[45%] items-center gap-1 text-right text-stripe-400">
                      <Church size={14} className="mt-0.5 shrink-0" /> Aparecida-SP
                    </span>
                  </div>
                </div>
                <div
                  className="absolute inset-x-[8%] bottom-[10%] flex items-center justify-center gap-[6%] rounded-xl bg-black/45 py-[3%] text-white backdrop-blur-sm"
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
                  imgClassName="opacity-45"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 pointer-events-none" />
                {/* pointer-events-none (Rodada 28): este bloco não tem nada
                    clicável, mas cobre o card inteiro (h-full w-full) com o
                    mesmo z-10 do arraste de foto — como o z-index empata,
                    quem vem depois no HTML "ganha" e bloqueava o arraste da
                    foto por baixo, mesmo nas áreas visualmente vazias entre o
                    selo e o texto. Era exatamente o bug relatado pelo
                    usuário ("fica sobre a foto, sem ter como ajustar"). */}
                <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-[4%] px-[8%] text-center text-white pointer-events-none">
                  <p style={{ fontFamily: FONTE_TITULO, fontStyle: "italic", fontWeight: 700, fontSize: "3.4cqw" }}>
                    O Peregrino apresenta
                  </p>
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
                  <p style={{ fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: "6.4cqw", lineHeight: 1.1, textAlign: "center" }}>
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
