// Rodada 68 — carimbo do caderno de bordo: nome do PAP em volta, km no
// centro, cidade embaixo, com data e hora em que o peregrino leu o QR code.
const CORES = ["#1d4ed8", "#b91c1c", "#15803d", "#7e22ce", "#b45309", "#0f766e", "#be185d"];

function hash(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function encurtar(texto: string, max: number) {
  return texto.length > max ? `${texto.slice(0, max - 1).trim()}…` : texto;
}

export interface DadosCarimbo {
  id: string;
  pap_nome: string;
  cidade: string | null;
  km: number | null;
  carimbado_em: string;
}

export default function CarimboPap({ carimbo, girar = true }: { carimbo: DadosCarimbo; girar?: boolean }) {
  const h = hash(carimbo.id);
  const cor = CORES[h % CORES.length];
  const giro = girar ? ((h >> 3) % 17) - 8 : 0;
  const dt = new Date(carimbo.carimbado_em);
  const data = dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const idTopo = `carimbo-topo-${carimbo.id}`;
  const idBase = `carimbo-base-${carimbo.id}`;
  const nome = encurtar(carimbo.pap_nome.toUpperCase(), 28);
  const cidade = encurtar((carimbo.cidade ?? "").toUpperCase(), 22);

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full"
      style={{ transform: `rotate(${giro}deg)` }}
      role="img"
      aria-label={`Carimbo ${carimbo.pap_nome}, ${data} às ${hora}`}
    >
      <defs>
        <path id={idTopo} d="M 30,100 A 70,70 0 0 1 170,100" />
        <path id={idBase} d="M 24,100 A 76,76 0 0 0 176,100" />
      </defs>
      <g fill="none" stroke={cor} strokeOpacity="0.85">
        <circle cx="100" cy="100" r="94" strokeWidth="5" />
        <circle cx="100" cy="100" r="84" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="60" strokeWidth="1.5" />
      </g>
      <g fill={cor} fillOpacity="0.9" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" textAnchor="middle">
        <text fontSize={nome.length > 20 ? 11 : 13} letterSpacing="1">
          <textPath href={`#${idTopo}`} startOffset="50%">
            {nome}
          </textPath>
        </text>
        <text fontSize="11" letterSpacing="1">
          <textPath href={`#${idBase}`} startOffset="50%">
            {cidade || "O PEREGRINO"}
          </textPath>
        </text>
        <text x="100" y="84" fontSize="11">
          {carimbo.km != null ? "KM" : "PAP"}
        </text>
        <text x="100" y="109" fontSize={carimbo.km != null ? 26 : 18}>
          {carimbo.km != null ? Number(carimbo.km).toLocaleString("pt-BR") : "✓"}
        </text>
        <text x="100" y="128" fontSize="10" fontWeight="700">
          {data}
        </text>
        <text x="100" y="141" fontSize="10" fontWeight="700">
          {hora}
        </text>
        <text x="31" y="104" fontSize="10">★</text>
        <text x="169" y="104" fontSize="10">★</text>
      </g>
    </svg>
  );
}
