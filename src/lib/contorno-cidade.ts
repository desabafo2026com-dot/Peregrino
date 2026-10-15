// Rodada 73 — contorno (limite municipal) de uma cidade, para o carimbo de
// saída do caderno de bordo. Fonte: API pública e gratuita do IBGE
// (localidades + malhas). O resultado vira um caminho SVG num quadrado
// 0..100, guardado em cache por 30 dias no servidor.

const IBGE = process.env.IBGE_API_BASE ?? "https://servicodados.ibge.gov.br";
const UM_MES = 60 * 60 * 24 * 30;

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface MunicipioIbge {
  id: number;
  nome: string;
  ufSigla?: string;
}

// Com "view=nivelado" o IBGE devolve campos planos (municipio-id,
// municipio-nome); sem ele, id/nome. Aceita os dois formatos.
function lerMunicipio(m: Record<string, unknown>): MunicipioIbge {
  return {
    id: Number(m["municipio-id"] ?? m.id),
    nome: String(m["municipio-nome"] ?? m.nome ?? ""),
  };
}

async function buscarMunicipio(cidade: string, uf: string | null): Promise<MunicipioIbge | null> {
  const alvo = normalizar(cidade);
  if (!alvo) return null;
  const tentar = async (url: string) => {
    const r = await fetch(url, { next: { revalidate: UM_MES } });
    if (!r.ok) return [] as MunicipioIbge[];
    return ((await r.json()) as Record<string, unknown>[]).map(lerMunicipio);
  };
  // UF informada primeiro; depois os estados de onde mais vêm peregrinos
  // (listas por estado são pequenas e ficam em cache).
  const ufs = [uf, "SP", "RJ", "MG", "PR", "ES", "GO", "DF", "SC", "RS", "BA"].filter(
    (u, i, arr): u is string => !!u && arr.indexOf(u) === i
  );
  for (const u of ufs) {
    const lista = await tentar(`${IBGE}/api/v1/localidades/estados/${encodeURIComponent(u)}/municipios?view=nivelado`);
    const achou = lista.find((m) => normalizar(m.nome) === alvo);
    if (achou) return { ...achou, ufSigla: u };
  }
  return null;
}

type Anel = [number, number][];

function aneisDe(geo: unknown): Anel[] {
  const aneis: Anel[] = [];
  const visitar = (g: { type?: string; coordinates?: unknown; geometry?: unknown; features?: unknown[] } | null) => {
    if (!g) return;
    if (g.type === "FeatureCollection") (g.features ?? []).forEach((f) => visitar(f as never));
    else if (g.type === "Feature") visitar(g.geometry as never);
    else if (g.type === "Polygon") aneis.push(((g.coordinates as Anel[]) ?? [])[0] ?? []);
    else if (g.type === "MultiPolygon") ((g.coordinates as Anel[][]) ?? []).forEach((p) => aneis.push(p[0] ?? []));
  };
  visitar(geo as never);
  return aneis.filter((a) => a.length > 2);
}

// Projeção simples (equiretangular corrigida pela latitude) encaixada num
// quadrado 0..100 com margem; usa só o maior polígono (ilhas ficam de fora).
export function caminhoSvg(geo: unknown): string | null {
  const aneis = aneisDe(geo);
  if (!aneis.length) return null;
  const area = (a: Anel) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      const [x1, y1] = a[i];
      const [x2, y2] = a[(i + 1) % a.length];
      s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s / 2);
  };
  const anel = aneis.sort((a, b) => area(b) - area(a))[0];
  const latMedia = anel.reduce((s, p) => s + p[1], 0) / anel.length;
  const k = Math.cos((latMedia * Math.PI) / 180);
  const pts = anel.map(([lon, lat]) => [lon * k, -lat] as [number, number]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const largura = Math.max(...xs) - minX;
  const altura = Math.max(...ys) - minY;
  const escala = 90 / Math.max(largura, altura);
  const offX = 5 + (90 - largura * escala) / 2;
  const offY = 5 + (90 - altura * escala) / 2;
  // reduz pontos muito próximos (deixa o caminho leve)
  const saida: string[] = [];
  let ult: [number, number] | null = null;
  for (const [x, y] of pts) {
    const px = offX + (x - minX) * escala;
    const py = offY + (y - minY) * escala;
    if (ult && Math.hypot(px - ult[0], py - ult[1]) < 0.6) continue;
    saida.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    ult = [px, py];
  }
  if (saida.length < 3) return null;
  return `M${saida.join("L")}Z`;
}

export async function contornoDaCidade(cidade: string, uf: string | null): Promise<{ nome: string; uf: string | null; caminho: string } | null> {
  try {
    // "Taubaté - SP", "Taubaté/SP", "Taubaté (SP)": separa a UF do nome.
    const sufixo = cidade.trim().match(/^(.*?)[\s]*(?:[-/,(]\s*)([A-Za-z]{2})\)?$/);
    if (sufixo && sufixo[1].trim()) {
      cidade = sufixo[1].trim();
      uf = sufixo[2].toUpperCase();
    }
    const m = await buscarMunicipio(cidade, uf);
    if (!m) return null;
    const r = await fetch(`${IBGE}/api/v3/malhas/municipios/${m.id}?formato=application/vnd.geo+json&qualidade=minima`, {
      next: { revalidate: UM_MES },
    });
    if (!r.ok) return null;
    const caminho = caminhoSvg(await r.json());
    return caminho ? { nome: m.nome, uf: m.ufSigla ?? null, caminho } : null;
  } catch {
    return null;
  }
}
