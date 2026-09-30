// Rodada 56 — geração de PNG a partir de um elemento da tela (arte do
// Romaria Plus e credencial do peregrino), mais resistente a celulares.
//
// Relato: em alguns aparelhos a arte baixada saía cortada, só com a parte
// da esquerda. A captura antiga deixava o html-to-image medir o elemento e
// escolher a escala sozinho (depende do celular). Agora:
//  1. largura/altura são medidas uma vez e forçadas no clone, com tamanho
//     final fixo (ex.: 1080 px de largura, igual em qualquer aparelho);
//  2. no iPhone roda uma captura "de aquecimento" antes (o Safari às vezes
//     ignora as fotos na primeira passada);
//  3. o resultado é conferido: se as bordas da direita/de baixo vierem
//     vazias (sinal de corte), gera de novo com outro motor (html2canvas),
//     que desenha a tela sem depender do recurso que falha nesses aparelhos.

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
    setTimeout(finalizar, 5000);
  });
}

function ehIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function carregar(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Confere se a imagem gerada tem conteúdo até as bordas da direita e de
// baixo (no meio delas, longe dos cantos arredondados). Se mais da metade
// dos pontos vier transparente, a captura foi cortada.
export async function imagemPareceCortada(dataUrl: string): Promise<boolean> {
  try {
    const img = await carregar(dataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return true;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);
    const pontos: [number, number][] = [];
    for (let i = 2; i <= 8; i++) {
      pontos.push([w - 3, Math.round((h * i) / 10)]); // borda direita
      pontos.push([Math.round((w * i) / 10), h - 3]); // borda de baixo
      pontos.push([Math.round(w * 0.9), Math.round((h * i) / 10)]); // faixa perto da direita
    }
    let vazios = 0;
    for (const [x, y] of pontos) {
      if (ctx.getImageData(x, y, 1, 1).data[3] < 10) vazios++;
    }
    return vazios > pontos.length / 2;
  } catch {
    return false;
  }
}

// Garante o tamanho final exato (o arredondamento da medida da tela pode
// dar 1 ou 2 pixels a menos/mais) redesenhando numa tela do tamanho certo.
async function ajustarTamanho(dataUrl: string, largura: number, altura: number): Promise<string> {
  const img = await carregar(dataUrl);
  if (img.naturalWidth === largura && img.naturalHeight === altura) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, largura, altura);
  return canvas.toDataURL("image/png");
}

export async function gerarPngDoElemento(
  el: HTMLElement,
  { larguraFinal, alturaFinal }: { larguraFinal: number; alturaFinal?: number }
): Promise<string> {
  await Promise.all(Array.from(el.querySelectorAll("img")).map(aguardarImagem));
  if (document.fonts?.ready) await document.fonts.ready;

  const rect = el.getBoundingClientRect();
  const largura = Math.max(1, Math.round(rect.width));
  const altura = Math.max(1, Math.round(rect.height));
  const escala = larguraFinal / largura;
  const alturaSaida = alturaFinal ?? Math.round((larguraFinal * rect.height) / rect.width);

  const { toPng } = await import("html-to-image");
  const opcoes = {
    width: largura,
    height: altura,
    canvasWidth: largura,
    canvasHeight: altura,
    pixelRatio: escala,
    style: {
      width: `${largura}px`,
      height: `${altura}px`,
      maxWidth: "none",
      minWidth: "0",
      margin: "0",
      transform: "none",
      boxShadow: "none",
    },
  };

  let resultado: string | null = null;
  let motivo = "";
  // Chave de teste: localStorage "peregrino:forcarPlanoB" = "1" força o plano B.
  let forcarPlanoB = false;
  try {
    forcarPlanoB = window.localStorage.getItem("peregrino:forcarPlanoB") === "1";
  } catch {
    forcarPlanoB = false;
  }
  if (forcarPlanoB) {
    motivo = "forçado para teste";
  } else {
    try {
      if (ehIOS()) await toPng(el, opcoes);
      resultado = await toPng(el, opcoes);
    } catch (e) {
      resultado = null;
      motivo = `erro: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (resultado) {
    if (!(await imagemPareceCortada(resultado))) return ajustarTamanho(resultado, larguraFinal, alturaSaida);
    motivo = "bordas vazias (corte)";
  }

  // Plano B: outro motor de desenho.
  console.info(`[arte] usando o plano B (${motivo}); tela ${largura}x${altura}, dpr ${window.devicePixelRatio}`);
  const { default: html2canvas } = await import("html2canvas-pro");
  const canvas = await html2canvas(el, {
    scale: escala,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    width: largura,
    height: altura,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
  });
  return ajustarTamanho(canvas.toDataURL("image/png"), larguraFinal, alturaSaida);
}
