// Rodada 60 — cartaz para imprimir e colar em pontos do caminho: nome do
// app, ícone, o QR code grande e, embaixo, "Para você, peregrino: ter
// informações durante o trajeto, registrar sua peregrinação e receber um
// certificado". Desenhado direto num <canvas> (folha A4 em pé, 300 dpi),
// sem depender de captura de tela — sai igual em qualquer celular.

import QRCode from "qrcode";

export const CARTAZ_LARGURA = 2480; // A4 a 300 dpi
export const CARTAZ_ALTURA = 3508;

const AZUL = "#1f3b6b";
const AZUL_CLARO = "#2c4f8a";
const LARANJA = "#e0892b";
const LARANJA_CLARO = "#f5a54a";
const LARANJA_ESCURO = "#b8621a";
const CREME = "#fdf6ec";
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const ITENS = ["Ter informações durante o trajeto", "Registrar sua peregrinação", "Receber um certificado"];

async function carregarFontes() {
  if (typeof FontFace === "undefined") return;
  const fontes = [
    new FontFace("PlayfairCartaz", "url(/fonts/playfair-display/playfair-display-latin-800-normal.woff2)", {
      weight: "800",
    }),
    new FontFace("PlayfairCartaz", "url(/fonts/playfair-display/playfair-display-latin-700-italic.woff2)", {
      weight: "700",
      style: "italic",
    }),
  ];
  await Promise.all(
    fontes.map(async (f) => {
      try {
        document.fonts.add(await f.load());
      } catch {
        // sem a fonte, usa a serifada padrão
      }
    })
  );
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Escreve centralizado, diminuindo a fonte até caber na largura.
function textoCentral(ctx: CanvasRenderingContext2D, texto: string, y: number, fonte: (px: number) => string, px: number, maxLargura: number) {
  let tamanho = px;
  ctx.font = fonte(tamanho);
  while (ctx.measureText(texto).width > maxLargura && tamanho > 20) {
    tamanho -= 4;
    ctx.font = fonte(tamanho);
  }
  ctx.fillText(texto, CARTAZ_LARGURA / 2, y);
}

export async function gerarCartazQrCode(url: string): Promise<HTMLCanvasElement> {
  const W = CARTAZ_LARGURA;
  const H = CARTAZ_ALTURA;
  const [, logo] = await Promise.all([carregarFontes(), carregarImagem("/icons/icon-512.png").catch(() => null)]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Fundo creme
  ctx.fillStyle = CREME;
  ctx.fillRect(0, 0, W, H);

  // Faixa de cima, azul com brilho laranja embaixo (como o ícone)
  const topo = 1180;
  const grad = ctx.createLinearGradient(0, 0, 0, topo);
  grad.addColorStop(0, AZUL);
  grad.addColorStop(0.62, AZUL_CLARO);
  grad.addColorStop(1, "#c9772a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, topo - 90);
  ctx.quadraticCurveTo(W / 2, topo + 90, 0, topo - 90);
  ctx.closePath();
  ctx.fill();
  // fio laranja na curva
  ctx.strokeStyle = LARANJA_CLARO;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(0, topo - 90);
  ctx.quadraticCurveTo(W / 2, topo + 90, W, topo - 90);
  ctx.stroke();

  // Ícone
  const lado = 470;
  if (logo) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(logo, (W - lado) / 2, 110, lado, lado);
    ctx.restore();
  }

  // Nome do app
  ctx.fillStyle = "#ffffff";
  textoCentral(ctx, "O Peregrino", 820, (px) => `800 ${px}px PlayfairCartaz, Georgia, serif`, 230, W - 240);
  ctx.fillStyle = "#fde7cc";
  textoCentral(ctx, "App de apoio a quem caminha pela Via Dutra até Aparecida", 945, (px) => `600 ${px}px ${SANS}`, 66, W - 300);

  // QR code num cartão branco com borda laranja
  const cartao = 1120;
  const cx = (W - cartao) / 2;
  const cy = 1220;
  ctx.save();
  ctx.shadowColor = "rgba(31,59,107,0.25)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  retanguloArredondado(ctx, cx, cy, cartao, cartao, 70);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = LARANJA;
  ctx.lineWidth = 16;
  retanguloArredondado(ctx, cx, cy, cartao, cartao, 70);
  ctx.stroke();

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, {
    width: 980,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: AZUL, light: "#ffffff" },
  });
  ctx.drawImage(qr, (W - 980) / 2, cy + (cartao - 980) / 2, 980, 980);

  // Chamada embaixo do QR
  ctx.fillStyle = AZUL;
  textoCentral(ctx, "Aponte a câmera do celular para o código", cy + cartao + 110, (px) => `700 ${px}px ${SANS}`, 70, W - 300);

  // "Para você, peregrino:"
  const yTitulo = cy + cartao + 300;
  ctx.fillStyle = LARANJA_ESCURO;
  textoCentral(ctx, "Para você, peregrino:", yTitulo, (px) => `italic 700 ${px}px PlayfairCartaz, Georgia, serif`, 130, W - 300);

  // Itens com marcador de "check" — bloco centralizado, texto à esquerda
  ctx.font = `700 92px ${SANS}`;
  const maiorTexto = Math.max(...ITENS.map((t) => ctx.measureText(t).width));
  const raio = 46;
  const espaco = 40;
  const larguraBloco = raio * 2 + espaco + maiorTexto;
  const xBloco = (W - larguraBloco) / 2;
  ITENS.forEach((texto, i) => {
    const y = yTitulo + 170 + i * 150;
    const xc = xBloco + raio;
    const yc = y - 32;
    ctx.fillStyle = LARANJA;
    ctx.beginPath();
    ctx.arc(xc, yc, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(xc - 20, yc + 1);
    ctx.lineTo(xc - 5, yc + 17);
    ctx.lineTo(xc + 22, yc - 15);
    ctx.stroke();
    ctx.fillStyle = AZUL;
    ctx.textAlign = "left";
    ctx.font = `700 92px ${SANS}`;
    ctx.fillText(texto, xBloco + raio * 2 + espaco, y);
    ctx.textAlign = "center";
  });

  // Rodapé azul com o endereço
  const rodape = 230;
  ctx.fillStyle = AZUL;
  ctx.fillRect(0, H - rodape, W, rodape);
  ctx.fillStyle = LARANJA;
  ctx.fillRect(0, H - rodape, W, 14);
  ctx.fillStyle = "#ffffff";
  const endereco = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  textoCentral(ctx, `Gratuito  •  ${endereco}`, H - rodape / 2 + 30, (px) => `700 ${px}px ${SANS}`, 74, W - 240);

  return canvas;
}

export function canvasParaBlob(canvas: HTMLCanvasElement, tipo = "image/png", qualidade?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha ao gerar a imagem"))), tipo, qualidade)
  );
}
