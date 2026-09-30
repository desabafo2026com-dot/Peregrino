import {
  Lightbulb,
  Footprints,
  Shirt,
  MoonStar,
  GlassWater,
  UsersRound,
  IdCard,
  MessageCircleHeart,
  HeartPulse,
  HeadphoneOff,
  OctagonPause,
  TrafficCone,
  type LucideIcon,
} from "lucide-react";

// Rodada 55 — as dicas de segurança viraram cards coloridos, um por dica,
// no estilo da referência enviada pelo usuário (título curto em destaque,
// texto de apoio e uma ilustração grande), alternando cores e o lado da
// ilustração. Mesmo conteúdo das dicas anteriores (inclusive as três da
// Rodada 28).
interface Dica {
  titulo: string;
  texto: string;
  Icone: LucideIcon;
}

const DICAS: Dica[] = [
  {
    titulo: "Caminhe de frente para os carros",
    texto: "Sem marginal ou acostamento largo, ande sempre de frente para o tráfego, vendo quem vem.",
    Icone: Footprints,
  },
  {
    titulo: "Utilize roupas claras!",
    texto: "Cores claras ou refletivas deixam você mais visível aos motoristas, principalmente ao amanhecer, ao entardecer e à noite.",
    Icone: Shirt,
  },
  {
    titulo: "Evite a madrugada",
    texto: "Não caminhe de madrugada em trechos sem iluminação.",
    Icone: MoonStar,
  },
  {
    titulo: "Hidrate-se e descanse",
    texto: "Beba água sempre e faça pausas nos Pontos de Apoio ao Peregrino (PAP).",
    Icone: GlassWater,
  },
  {
    titulo: "Em fila única",
    texto: "Nos trechos estreitos, ande um atrás do outro — nunca lado a lado.",
    Icone: UsersRound,
  },
  {
    titulo: "Documento e contato à vista",
    texto: "Leve um documento e o telefone de um contato de emergência sempre fácil de achar (a credencial do peregrino ajuda).",
    Icone: IdCard,
  },
  {
    titulo: "Avise alguém de confiança",
    texto: "Conte seu trajeto e os horários previstos para alguém que fica em casa.",
    Icone: MessageCircleHeart,
  },
  {
    titulo: "Sentiu mal-estar?",
    texto: "Procure o PAP mais próximo ou acione a emergência pelo botão vermelho do app.",
    Icone: HeartPulse,
  },
  {
    titulo: "Sem fones de ouvido",
    texto: "Fique atento aos sons da rodovia: buzina e motor avisam o perigo antes.",
    Icone: HeadphoneOff,
  },
  {
    titulo: "Parou? Afaste-se da pista",
    texto: "Sempre que parar, fique o mais longe possível da faixa dos carros.",
    Icone: OctagonPause,
  },
  {
    titulo: "Atravesse com calma",
    texto: "Antes de atravessar uma faixa, olhe bem para os dois lados e só vá quando der para passar em segurança.",
    Icone: TrafficCone,
  },
];

const ESTILOS = [
  { fundo: "#1e2a4a", texto: "#ffffff", titulo: "#fbbf24", icone: "#fbbf24", circulo: "rgba(255,255,255,0.08)" },
  { fundo: "#fbbf24", texto: "#2b1a0a", titulo: "#1e2a4a", icone: "#1e2a4a", circulo: "rgba(255,255,255,0.35)" },
  { fundo: "#ffffff", texto: "#3f3f46", titulo: "#9a3412", icone: "#c2410c", circulo: "#fef3c7" },
];

export default function DicasSegurancaCards() {
  return (
    <div className="flex flex-col gap-3">
      <div className="card flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          <Lightbulb size={30} />
        </span>
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
          Selecionamos algumas <strong className="text-amber-800 dark:text-amber-500">SUGESTÕES</strong> para tornar sua
          peregrinação ainda mais segura e gratificante:
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {DICAS.map((d, i) => {
          const e = ESTILOS[i % ESTILOS.length];
          const iconeADireita = i % 2 === 0;
          return (
            <article
              key={d.titulo}
              className={`flex items-center gap-4 overflow-hidden rounded-2xl p-4 shadow-sm ${e.fundo === "#ffffff" ? "border border-neutral-200 dark:border-neutral-800" : ""} ${iconeADireita ? "flex-row" : "flex-row-reverse"}`}
              style={{ background: e.fundo, color: e.texto }}
            >
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-base leading-tight font-extrabold" style={{ color: e.titulo }}>
                  {d.titulo}
                </h3>
                <p className="text-sm leading-snug" style={{ textAlign: "left" }}>
                  {d.texto}
                </p>
              </div>
              <span
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                style={{ background: e.circulo, color: e.icone }}
              >
                <d.Icone size={44} strokeWidth={1.8} />
              </span>
            </article>
          );
        })}
      </div>
    </div>
  );
}
