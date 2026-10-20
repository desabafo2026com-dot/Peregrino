// Rodada 75 — todos os municípios de SP, MG e RJ (nome, UF e o centro do
// município, base pública do IBGE), para a "Cidade de origem" com busca por
// nome. Fica num arquivo estático (public/dados) e só é baixado quando o
// formulário é aberto.
import { distanciaMetros } from "@/lib/geo";

const distanciaKm = (a: number, b: number, c: number, d: number) => distanciaMetros(a, b, c, d) / 1000;

export interface Municipio {
  nome: string;
  uf: string;
  lat: number;
  lng: number;
}

let cache: Promise<Municipio[]> | null = null;

export function carregarMunicipios(): Promise<Municipio[]> {
  if (!cache) {
    cache = fetch("/dados/municipios-sp-mg-rj.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((linhas: [string, string, number, number][]) =>
        linhas.map(([nome, uf, lat, lng]) => ({ nome, uf, lat, lng }))
      )
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}

export function normalizarNome(t: string | null | undefined) {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PALAVRAS_LIGACAO = new Set(["de", "da", "do", "das", "dos", "e"]);

function iniciais(nome: string) {
  return normalizarNome(nome)
    .split(" ")
    .filter((p) => p && !PALAVRAS_LIGACAO.has(p))
    .map((p) => p[0])
    .join("");
}

const ORDEM_UF: Record<string, number> = { SP: 0, MG: 1, RJ: 2 };

// Busca por nome: primeiro os que começam com o texto, depois os que têm
// uma palavra começando com ele, depois pelas iniciais (ex.: "sjc" acha São
// José dos Campos) e por fim os que contêm o texto. SP, depois MG e RJ.
export function buscarMunicipios(lista: Municipio[], texto: string, limite = 12): Municipio[] {
  const q = normalizarNome(texto);
  if (!q) return [];
  const qSemEspaco = q.replace(/ /g, "");
  const pontuados: { m: Municipio; p: number }[] = [];
  for (const m of lista) {
    const n = normalizarNome(m.nome);
    let p = -1;
    if (n.startsWith(q)) p = 0;
    else if (n.split(" ").some((w) => w.startsWith(q))) p = 1;
    else if (qSemEspaco.length >= 2 && iniciais(m.nome).startsWith(qSemEspaco)) p = 2;
    else if (n.includes(q)) p = 3;
    if (p >= 0) pontuados.push({ m, p });
  }
  pontuados.sort(
    (a, b) =>
      a.p - b.p ||
      (ORDEM_UF[a.m.uf] ?? 9) - (ORDEM_UF[b.m.uf] ?? 9) ||
      a.m.nome.localeCompare(b.m.nome, "pt-BR")
  );
  return pontuados.slice(0, limite).map((x) => x.m);
}

export function rotuloMunicipio(m: Municipio) {
  return `${m.nome} - ${m.uf}`;
}

// Acha o município a partir do texto gravado em cidade_origem ("Cidade -
// UF", ou só o nome, como nas peregrinações antigas).
export function municipioDoTexto(lista: Municipio[], texto: string | null | undefined): Municipio | null {
  if (!texto) return null;
  const m = texto.trim().match(/^(.*?)\s*[-/]\s*([A-Za-z]{2})$/);
  const nome = normalizarNome(m ? m[1] : texto);
  const uf = m ? m[2].toUpperCase() : null;
  const candidatos = lista.filter((x) => normalizarNome(x.nome) === nome && (!uf || x.uf === uf));
  if (candidatos.length === 0) return null;
  return [...candidatos].sort((a, b) => (ORDEM_UF[a.uf] ?? 9) - (ORDEM_UF[b.uf] ?? 9))[0];
}

export function municipioMaisProximo(lista: Municipio[], lat: number, lng: number): Municipio | null {
  let melhor: { m: Municipio; d: number } | null = null;
  for (const m of lista) {
    const d = distanciaKm(lat, lng, m.lat, m.lng);
    if (!melhor || d < melhor.d) melhor = { m, d };
  }
  return melhor?.m ?? null;
}

// Por qual cidade de check-in a pessoa entra no caminho: a própria cidade,
// se ela fizer parte de alguma rota (na ordem das rotas), ou a cidade de
// check-in mais próxima. Entre as que estão quase tão perto (até 10 km a
// mais), fica a que está mais adiante no caminho — para não sugerir voltar.
export function pontoDeEntradaSugerido<
  P extends { id: string; cidade: string; latitude: number; longitude: number; km_aproximado?: number | null }
>(municipio: Municipio, gruposPorRota: { cidades: P[] }[]): { ponto: P; distanciaKm: number } | null {
  const nome = normalizarNome(municipio.nome);
  for (const g of gruposPorRota) {
    const p = g.cidades.find(
      (c) => normalizarNome(c.cidade) === nome && distanciaKm(municipio.lat, municipio.lng, c.latitude, c.longitude) < 25
    );
    if (p) return { ponto: p, distanciaKm: 0 };
  }
  const candidatos: { ponto: P; ate: number; falta: number }[] = [];
  for (const g of gruposPorRota) {
    const ultimo = g.cidades[g.cidades.length - 1];
    if (!ultimo) continue;
    for (const c of g.cidades.slice(0, -1)) {
      candidatos.push({
        ponto: c,
        ate: distanciaKm(municipio.lat, municipio.lng, c.latitude, c.longitude),
        falta: distanciaKm(c.latitude, c.longitude, ultimo.latitude, ultimo.longitude),
      });
    }
  }
  if (candidatos.length === 0) return null;
  const menor = Math.min(...candidatos.map((c) => c.ate));
  const escolhido = candidatos
    .filter((c) => c.ate <= menor + 10)
    .sort((a, b) => a.falta - b.falta || a.ate - b.ate)[0];
  return { ponto: escolhido.ponto, distanciaKm: escolhido.ate };
}
