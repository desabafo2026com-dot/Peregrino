// Rodada 74 — deixa transparente o fundo claro (branco/creme) de uma imagem
// de carimbo. Só apaga o fundo que encosta nas bordas da imagem (preenchimento
// a partir das bordas), então o branco DENTRO do carimbo continua. Se a
// imagem já tem fundo transparente ou o fundo não é claro, não muda nada.
// Tudo feito no próprio aparelho (canvas), sem custo.
export function removerFundoClaro(canvas: HTMLCanvasElement, tolerancia = 60): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const { width: w, height: h } = canvas;
  if (!w || !h) return false;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // cor do fundo = média dos quatro cantos (ignorando os já transparentes)
  const cantos = [0, w - 1, (h - 1) * w, h * w - 1];
  let r = 0, g = 0, b = 0, n = 0;
  for (const p of cantos) {
    if (d[p * 4 + 3] < 200) continue;
    r += d[p * 4];
    g += d[p * 4 + 1];
    b += d[p * 4 + 2];
    n++;
  }
  if (n === 0) return false; // já transparente
  r /= n;
  g /= n;
  b /= n;
  if (0.299 * r + 0.587 * g + 0.114 * b < 175) return false; // fundo não é claro

  const dist = (p: number) => {
    const i = p * 4;
    return Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b));
  };
  const visitado = new Uint8Array(w * h);
  const fila = new Int32Array(w * h);
  let ini = 0, fim = 0;
  const empilhar = (p: number) => {
    if (visitado[p]) return;
    visitado[p] = 1;
    if (d[p * 4 + 3] < 20 || dist(p) <= tolerancia) fila[fim++] = p;
  };
  for (let x = 0; x < w; x++) {
    empilhar(x);
    empilhar((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    empilhar(y * w);
    empilhar(y * w + w - 1);
  }
  while (ini < fim) {
    const p = fila[ini++];
    const x = p % w;
    const y = (p - x) / w;
    // borda suave: quanto mais perto da cor do fundo, mais transparente
    const k = dist(p) / tolerancia;
    d[p * 4 + 3] = Math.min(d[p * 4 + 3], Math.round(255 * Math.max(0, k * k - 0.15)));
    if (x > 0) empilhar(p - 1);
    if (x < w - 1) empilhar(p + 1);
    if (y > 0) empilhar(p - w);
    if (y < h - 1) empilhar(p + w);
  }
  ctx.putImageData(img, 0, 0);
  return true;
}
