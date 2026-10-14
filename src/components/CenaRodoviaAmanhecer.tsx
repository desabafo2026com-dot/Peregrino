// Rodada 69 — cena da Via Dutra ao amanhecer (parte de baixo do modelo de
// arte "Amanhecer no caminho"): pista, acostamento com romeiros caminhando
// em fila, viaduto e mato na beira da estrada. Ilustração própria, em SVG
// (sem foto de terceiros), inspirada na visão real da rodovia.
// viewBox 1080 x 864, horizonte no topo; ponto de fuga em (520, 0).

const ALTURA = 864;

function naReta(x0: number, x1: number, y: number) {
  return x0 + (x1 - x0) * (y / ALTURA);
}

// Faixas tracejadas da pista, com perspectiva (mais curtas e finas ao longe).
const TRACOS: string[] = Array.from({ length: 16 }, (_, k) => {
  const ta = Math.pow(k / 16, 1.7);
  const tb = ta + 0.55 * (Math.pow((k + 1) / 16, 1.7) - ta);
  const pt = (t: number) => [517 + (-30 - 517) * t, ALTURA * t] as const;
  const larg = (t: number) => 0.8 + 13 * t;
  const [xa, ya] = pt(ta);
  const [xb, yb] = pt(tb);
  return `${xa - larg(ta)},${ya} ${xa + larg(ta)},${ya} ${xb + larg(tb)},${yb} ${xb - larg(tb)},${yb}`;
});

interface Romeiro {
  y: number; // pés
  f: number; // posição no acostamento (0 = beira da pista, 1 = beira do mato)
  camisa: string;
  pele: string;
  calca: string;
  mochila?: boolean;
  cajado?: boolean;
  chapeu?: boolean;
  passo?: number; // -1 ou 1
}

const ROMEIROS: Romeiro[] = [
  { y: 30, f: 0.45, camisa: "#d9a92a", pele: "#6b4a33", calca: "#2b2b2b", mochila: true },
  { y: 44, f: 0.62, camisa: "#e8e3d8", pele: "#8a6043", calca: "#3a3f4a", passo: -1 },
  { y: 62, f: 0.38, camisa: "#d9a92a", pele: "#5a3d2b", calca: "#2b2b2b", cajado: true },
  { y: 88, f: 0.6, camisa: "#c2410c", pele: "#8a6043", calca: "#1f2937", mochila: true, passo: -1 },
  { y: 122, f: 0.36, camisa: "#e8e3d8", pele: "#6b4a33", calca: "#1f2937", mochila: true, chapeu: true },
  { y: 170, f: 0.66, camisa: "#d9a92a", pele: "#5a3d2b", calca: "#2b2b2b", cajado: true, passo: -1 },
  { y: 235, f: 0.3, camisa: "#1e40af", pele: "#8a6043", calca: "#2b2b2b", mochila: true },
  { y: 300, f: 0.62, camisa: "#d9a92a", pele: "#6b4a33", calca: "#111827", mochila: true, cajado: true, chapeu: true, passo: -1 },
  { y: 390, f: 0.3, camisa: "#e8e3d8", pele: "#5a3d2b", calca: "#3a3f4a", mochila: true },
  { y: 450, f: 0.7, camisa: "#d9a92a", pele: "#8a6043", calca: "#2b2b2b", mochila: true, cajado: true, chapeu: true },
];

function FiguraRomeiro({ r }: { r: Romeiro }) {
  const esq = naReta(530, 452, r.y);
  const dir = naReta(542, 900, r.y);
  const x = esq + (dir - esq) * r.f;
  const s = 0.08 + (r.y / ALTURA) * 2.1;
  const p = r.passo ?? 1;
  return (
    <g transform={`translate(${x.toFixed(1)} ${r.y}) scale(${s.toFixed(3)})`}>
      {/* sombra no chão */}
      <ellipse cx="4" cy="0" rx="26" ry="5" fill="#000" opacity="0.28" />
      {/* pernas e tênis */}
      <rect x={-14 + p * 2} y="-64" width="11" height="62" rx="4" fill={r.calca} />
      <rect x={3 - p * 2} y="-62" width="11" height="58" rx="4" fill={r.calca} />
      <rect x={-16 + p * 2} y="-6" width="14" height="6" rx="2" fill="#f1f1f1" />
      <rect x={2 - p * 2} y="-8" width="14" height="6" rx="2" fill="#f1f1f1" />
      {/* braços */}
      <rect x="-27" y="-118" width="9" height="46" rx="4" fill={r.pele} transform={`rotate(${p * 6} -22 -118)`} />
      <rect x="18" y="-118" width="9" height="46" rx="4" fill={r.pele} transform={`rotate(${-p * 6} 22 -118)`} />
      {/* tronco */}
      <rect x="-21" y="-124" width="42" height="66" rx="12" fill={r.camisa} />
      {r.mochila && <rect x="-16" y="-120" width="32" height="42" rx="8" fill="#2f2f33" />}
      {/* cabeça */}
      <circle cx="0" cy="-138" r="13" fill={r.pele} />
      {r.chapeu ? (
        <>
          <ellipse cx="0" cy="-145" rx="21" ry="5" fill="#4a3b2a" />
          <rect x="-12" y="-158" width="24" height="13" rx="5" fill="#4a3b2a" />
        </>
      ) : (
        <path d="M-13,-140 C-13,-156 13,-156 13,-140 C8,-146 -8,-146 -13,-140 Z" fill="#1c1917" />
      )}
      {r.cajado && <line x1="30" y1="-150" x2="38" y2="0" stroke="#c9a06a" strokeWidth="5" strokeLinecap="round" />}
    </g>
  );
}

export default function CenaRodoviaAmanhecer({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 1080 ${ALTURA}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cena-chao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d7a52" />
          <stop offset="0.35" stopColor="#4d5a2f" />
          <stop offset="1" stopColor="#26301a" />
        </linearGradient>
        <linearGradient id="cena-pista" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d8a86" />
          <stop offset="0.4" stopColor="#57565a" />
          <stop offset="1" stopColor="#38373b" />
        </linearGradient>
        <linearGradient id="cena-acost" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9b89a" />
          <stop offset="0.5" stopColor="#a39a8a" />
          <stop offset="1" stopColor="#857f74" />
        </linearGradient>
        <linearGradient id="cena-luz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#ffcf7a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1080" height={ALTURA} fill="url(#cena-chao)" />
      {/* mato mais claro no barranco da direita */}
      <polygon points={`542,0 1080,0 1080,${ALTURA} 900,${ALTURA}`} fill="#5f6d36" opacity="0.55" />
      {/* linha de árvores no horizonte */}
      <path
        d="M0,22 C30,6 60,10 90,16 C120,4 160,6 190,14 C220,2 260,4 300,12 C330,6 360,8 395,14 C420,8 450,10 492,8 L492,0 L0,0 Z"
        fill="#2f3a22"
      />
      <path
        d="M560,8 C600,0 640,4 680,12 C720,-2 770,2 810,14 C850,2 890,4 930,16 C970,4 1020,6 1080,18 L1080,0 L560,0 Z"
        fill="#2f3a22"
      />
      {/* pista e acostamento */}
      <polygon points={`506,0 528,0 430,${ALTURA} -520,${ALTURA}`} fill="url(#cena-pista)" />
      {TRACOS.map((t, i) => (
        <polygon key={i} points={t} fill="#f2f2f2" opacity="0.85" />
      ))}
      <polygon points={`527,0 530,0 452,${ALTURA} 422,${ALTURA}`} fill="#f5f5f5" />
      <polygon points={`530,0 542,0 900,${ALTURA} 452,${ALTURA}`} fill="url(#cena-acost)" />
      {/* viaduto ao longe */}
      <rect x="430" y="6" width="190" height="6" fill="#6b6b6b" />
      <rect x="452" y="12" width="4" height="8" fill="#5a5a5a" />
      <rect x="590" y="12" width="4" height="8" fill="#5a5a5a" />
      {/* caminhão e carro na pista */}
      <rect x="500" y="22" width="13" height="12" rx="1" fill="#e5e7eb" />
      <rect x="500" y="31" width="13" height="4" fill="#1e3a8a" />
      <rect x="470" y="52" width="16" height="8" rx="2" fill="#374151" />
      {/* romeiros caminhando pelo acostamento, de costas, rumo a Aparecida */}
      {ROMEIROS.map((r, i) => (
        <FiguraRomeiro key={i} r={r} />
      ))}
      {/* luz do sol nascente sobre a cena */}
      <rect width="1080" height={ALTURA} fill="url(#cena-luz)" />
    </svg>
  );
}
