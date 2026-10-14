// Rodada 68/71 — desenho do carimbo do caderno de bordo como texto SVG,
// usado na tela (CarimboPap) e no PDF do caderno de bordo (mesmo desenho).
export interface DadosCarimbo {
  id: string;
  pap_nome: string;
  cidade: string | null;
  km: number | null;
  carimbado_em: string;
  // Rodada 72 — imagem própria do carimbo do PAP (enviada pelo admin).
  imagem_url?: string | null;
}

export const CORES_CARIMBO = ["#1d4ed8", "#b91c1c", "#15803d", "#7e22ce", "#b45309", "#0f766e", "#be185d"];

export function hashTexto(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function encurtar(texto: string, max: number) {
  return texto.length > max ? `${texto.slice(0, max - 1).trim()}…` : texto;
}

function esc(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function giroCarimbo(id: string) {
  return ((hashTexto(id) >> 3) % 17) - 8;
}

export function svgCarimbo(c: DadosCarimbo): string {
  const cor = CORES_CARIMBO[hashTexto(c.id) % CORES_CARIMBO.length];
  const dt = new Date(c.carimbado_em);
  const data = dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const idSeguro = c.id.replace(/[^a-zA-Z0-9_-]/g, "");
  const idTopo = `carimbo-topo-${idSeguro}`;
  const idBase = `carimbo-base-${idSeguro}`;
  const nome = esc(encurtar(c.pap_nome.toUpperCase(), 28));
  const cidade = esc(encurtar((c.cidade ?? "").toUpperCase(), 22)) || "O PEREGRINO";
  const tamNome = c.pap_nome.length > 20 ? 11 : 13;
  const km = c.km != null ? Number(c.km).toLocaleString("pt-BR") : null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<defs><path id="${idTopo}" d="M 30,100 A 70,70 0 0 1 170,100"/><path id="${idBase}" d="M 24,100 A 76,76 0 0 0 176,100"/></defs>
<g fill="none" stroke="${cor}" stroke-opacity="0.85"><circle cx="100" cy="100" r="94" stroke-width="5"/><circle cx="100" cy="100" r="84" stroke-width="1.5"/><circle cx="100" cy="100" r="60" stroke-width="1.5"/></g>
<g fill="${cor}" fill-opacity="0.9" font-family="Arial, Helvetica, sans-serif" font-weight="800" text-anchor="middle">
<text font-size="${tamNome}" letter-spacing="1"><textPath href="#${idTopo}" startOffset="50%">${nome}</textPath></text>
<text font-size="11" letter-spacing="1"><textPath href="#${idBase}" startOffset="50%">${cidade}</textPath></text>
<text x="100" y="84" font-size="11">${km != null ? "KM" : "PAP"}</text>
<text x="100" y="109" font-size="${km != null ? 26 : 18}">${km ?? "✓"}</text>
<text x="100" y="128" font-size="10" font-weight="700">${data}</text>
<text x="100" y="141" font-size="10" font-weight="700">${hora}</text>
<text x="31" y="104" font-size="10">★</text><text x="169" y="104" font-size="10">★</text>
</g></svg>`;
}

// Carimbo final do caderno: Nossa Senhora Aparecida (desenho usado nas
// artes) com "Ela me protegeu com seu manto" e "Aparecida-SP".
export function svgCarimboSanta(imagemDataUrl: string): string {
  const cor = "#1f3b6b";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 400 400" width="400" height="400">
<defs>
<path id="santa-topo" d="M 54,200 A 146,146 0 0 1 346,200"/>
<path id="santa-base" d="M 42,200 A 158,158 0 0 0 358,200"/>
<clipPath id="santa-recorte"><circle cx="200" cy="200" r="104"/></clipPath>
</defs>
<circle cx="200" cy="200" r="190" fill="#fffaf0"/>
<g fill="none" stroke="${cor}" stroke-opacity="0.9"><circle cx="200" cy="200" r="190" stroke-width="10"/><circle cx="200" cy="200" r="172" stroke-width="3"/><circle cx="200" cy="200" r="108" stroke-width="3"/></g>
<image href="${imagemDataUrl}" xlink:href="${imagemDataUrl}" x="78" y="96" width="244" height="201" preserveAspectRatio="xMidYMid meet" clip-path="url(#santa-recorte)"/>
<g fill="${cor}" font-family="Georgia, 'Times New Roman', serif" font-weight="700" text-anchor="middle">
<text font-size="18" letter-spacing="0.8"><textPath href="#santa-topo" xlink:href="#santa-topo" startOffset="50%">ELA ME PROTEGEU COM SEU MANTO</textPath></text>
<text font-size="22" letter-spacing="3"><textPath href="#santa-base" xlink:href="#santa-base" startOffset="50%">APARECIDA-SP</textPath></text>
<text x="38" y="207" font-size="18">★</text><text x="362" y="207" font-size="18">★</text>
</g></svg>`;
}

export function dataHoraCarimbo(iso: string) {
  const dt = new Date(iso);
  return {
    data: dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    hora: dt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
  };
}
