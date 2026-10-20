// Rodada 77 — transforma uma foto (do carimbo de verdade, carimbado num
// papel) ou uma imagem qualquer (logo, desenho) num carimbo virtual:
//   - o papel/fundo claro some (também o branco DE DENTRO do desenho);
//   - o que é "tinta" fica numa cor só (a cor original da tinta ou uma
//     escolhida), com um leve desgaste, como carimbo de borracha;
//   - corta as sobras e deixa a imagem quadrada.
// Também funciona com fotos com sombra/luz desigual: o fundo é medido em
// pedaços da imagem, não num valor único. Tudo no próprio aparelho (canvas).

export type ModoCarimbo = "tinta" | "cores";

export const CORES_TINTA: { id: string; nome: string; hex: string | null }[] = [
  { id: "original", nome: "Cor original", hex: null },
  { id: "azul", nome: "Azul", hex: "#1d4ed8" },
  { id: "vermelho", nome: "Vermelho", hex: "#b91c1c" },
  { id: "verde", nome: "Verde", hex: "#15803d" },
  { id: "roxo", nome: "Roxo", hex: "#7e22ce" },
  { id: "preto", nome: "Preto", hex: "#1f2937" },
];

export function carregarImagem(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Desenha a imagem num canvas de no máximo `lado` px (mantendo proporção).
export function imagemParaCanvas(img: HTMLImageElement | ImageBitmap, lado = 700): HTMLCanvasElement {
  const w = img.width;
  const h = img.height;
  const escala = Math.min(1, lado / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * escala));
  canvas.height = Math.max(1, Math.round(h * escala));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function luminancia(d: Uint8ClampedArray, i: number) {
  if (d[i + 3] < 30) return 255; // transparente conta como fundo
  return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
}

function percentil(valores: number[], p: number) {
  if (valores.length === 0) return 255;
  const ord = [...valores].sort((a, b) => a - b);
  return ord[Math.min(ord.length - 1, Math.max(0, Math.floor((ord.length - 1) * p)))];
}

// Fundo local: a imagem é dividida numa grade e, em cada pedaço, o fundo é
// o tom claro mais comum (percentil 85). Depois é interpolado.
function fundoLocal(lum: Float32Array, w: number, h: number): (x: number, y: number) => number {
  const G = 12;
  const cw = w / G;
  const ch = h / G;
  const grade = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const vals: number[] = [];
      const x0 = Math.floor(gx * cw);
      const x1 = Math.min(w, Math.floor((gx + 1) * cw));
      const y0 = Math.floor(gy * ch);
      const y1 = Math.min(h, Math.floor((gy + 1) * ch));
      const passo = Math.max(1, Math.floor((x1 - x0) / 12));
      for (let y = y0; y < y1; y += passo) for (let x = x0; x < x1; x += passo) vals.push(lum[y * w + x]);
      grade[gy * G + gx] = percentil(vals, 0.85);
    }
  }
  // suaviza: cada célula fica com o maior valor entre ela e as vizinhas
  // (um pedaço todo "tinta" não pode virar fundo)
  const suav = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++)
    for (let gx = 0; gx < G; gx++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = gy + dy;
          const xx = gx + dx;
          if (yy >= 0 && yy < G && xx >= 0 && xx < G) m = Math.max(m, grade[yy * G + xx]);
        }
      suav[gy * G + gx] = m;
    }
  return (x, y) => {
    const fx = Math.min(G - 1.001, Math.max(0, x / cw - 0.5));
    const fy = Math.min(G - 1.001, Math.max(0, y / ch - 0.5));
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const a = suav[iy * G + ix];
    const b = suav[iy * G + Math.min(G - 1, ix + 1)];
    const c = suav[Math.min(G - 1, iy + 1) * G + ix];
    const dd = suav[Math.min(G - 1, iy + 1) * G + Math.min(G - 1, ix + 1)];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + dd * tx) * ty;
  };
}

function suave(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function hexParaRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Ruído determinístico (sem Math.random) para o "desgaste" da tinta.
function ruido(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function efeitoCarimbo(
  origem: HTMLCanvasElement,
  opcoes: { modo?: ModoCarimbo; corHex?: string | null; lado?: number } = {}
): HTMLCanvasElement {
  const modo = opcoes.modo ?? "tinta";
  const w = origem.width;
  const h = origem.height;
  const ctxO = origem.getContext("2d", { willReadFrequently: true })!;
  const src = ctxO.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) lum[p] = luminancia(src, p * 4);

  const fundo = fundoLocal(lum, w, h);
  const amostra: number[] = [];
  const passo = Math.max(1, Math.floor((w * h) / 40000));
  for (let p = 0; p < w * h; p += passo) amostra.push(lum[p]);
  const tinta = percentil(amostra, 0.03);

  const alfa = new Float32Array(w * h);
  let somaR = 0, somaG = 0, somaB = 0, somaP = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const bg = fundo(x, y);
      const faixa = Math.max(45, bg - tinta);
      const escuro = (bg - lum[p]) / faixa;
      // pixels coloridos (tinta azul/vermelha clara) também contam
      const i = p * 4;
      const mx = Math.max(src[i], src[i + 1], src[i + 2]);
      const mn = Math.min(src[i], src[i + 1], src[i + 2]);
      const sat = src[i + 3] < 30 ? 0 : (mx - mn) / 255;
      const a = Math.max(suave(0.16, 0.5, escuro), suave(0.22, 0.45, sat) * 0.9);
      alfa[p] = src[i + 3] < 30 ? 0 : a;
      if (a > 0.7) {
        const peso = a;
        somaR += src[i] * peso;
        somaG += src[i + 1] * peso;
        somaB += src[i + 2] * peso;
        somaP += peso;
      }
    }
  }

  // cor da tinta
  let cor: [number, number, number];
  if (opcoes.corHex) cor = hexParaRgb(opcoes.corHex);
  else if (somaP > 0) {
    cor = [somaR / somaP, somaG / somaP, somaB / somaP];
    // tinta "viva": um pouco mais escura e mais saturada
    const media = (cor[0] + cor[1] + cor[2]) / 3;
    cor = cor.map((c) => Math.max(0, Math.min(255, (media + (c - media) * 1.35) * 0.85))) as [number, number, number];
  } else cor = [31, 59, 107];

  // recorte: só onde tem tinta, com margem, em quadrado
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alfa[y * w + x] > 0.3) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) {
    x0 = 0;
    y0 = 0;
    x1 = w - 1;
    y1 = h - 1;
  }
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const ladoBox = Math.round(Math.max(bw, bh) * 1.08);
  const ladoFinal = Math.min(opcoes.lado ?? 600, ladoBox);

  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const ctxT = tmp.getContext("2d")!;
  const out = ctxT.createImageData(w, h);
  const d = out.data;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const a = alfa[p];
    if (a <= 0) continue;
    if (modo === "cores") {
      d[i] = src[i];
      d[i + 1] = src[i + 1];
      d[i + 2] = src[i + 2];
      d[i + 3] = Math.round(255 * a);
    } else {
      const x = p % w;
      const y = (p - x) / w;
      const desgaste = 0.8 + 0.2 * ruido(Math.floor(x / 2), Math.floor(y / 2));
      d[i] = cor[0];
      d[i + 1] = cor[1];
      d[i + 2] = cor[2];
      d[i + 3] = Math.round(240 * a * desgaste);
    }
  }
  ctxT.putImageData(out, 0, 0);

  const final = document.createElement("canvas");
  final.width = ladoFinal;
  final.height = ladoFinal;
  const ctxF = final.getContext("2d")!;
  const cx = x0 + bw / 2;
  const cy = y0 + bh / 2;
  ctxF.drawImage(
    tmp,
    cx - ladoBox / 2,
    cy - ladoBox / 2,
    ladoBox,
    ladoBox,
    0,
    0,
    ladoFinal,
    ladoFinal
  );
  return final;
}

// Para imagens antigas (já salvas com fundo/interior branco): tira o branco
// e o quase branco sem cor em toda a imagem, mantendo as cores do resto.
export function limparBrancoTodo(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let mudou = false;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (mx - mn < 40 && l > 200) {
      const novo = Math.round(d[i + 3] * Math.min(1, Math.max(0, (245 - l) / 45)));
      if (novo !== d[i + 3]) {
        d[i + 3] = novo;
        mudou = true;
      }
    }
  }
  if (mudou) ctx.putImageData(img, 0, 0);
  return mudou;
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falhou"))), "image/png")
  );
}
