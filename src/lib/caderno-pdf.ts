// Rodada 71 — exporta o caderno de bordo em PDF (A4) para guardar ou
// imprimir: capa com arte do app e os dados da peregrinação, depois os
// carimbos dos PAPs separados por cidade e, no fim, o carimbo de Nossa
// Senhora Aparecida ("Ela me protegeu com seu manto" · "Aparecida-SP").
// Tudo gerado no próprio aparelho (sem servidor e sem custo).
import { limparBrancoTodo } from "@/lib/efeito-carimbo";
import { dataHoraCarimbo, giroCarimbo, svgCarimbo, svgCarimboCidade, svgCarimboSaida, svgCarimboSanta, type DadosCarimbo } from "@/lib/carimbo-svg";

export interface CapaCaderno {
  nome: string;
  ano: string;
  origem: string | null;
  periodo: string | null; // "09 a 12/10/2026" ou "desde 09/10/2026"
  // Rodada 73 — carimbo de saída (contorno da cidade) e de chegada (só
  // depois de chegar a Aparecida).
  saida?: { cidade: string; uf: string | null; iso: string } | null;
  chegadaIso?: string | null;
}

async function dataUrlDe(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Imagem própria do carimbo (Rodada 72) → PNG quadrado, girado.
async function imagemParaPng(url: string, lado: number, giroGraus = 0): Promise<string> {
  const img = await carregarImagem(await dataUrlDe(url));
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(lado / 2, lado / 2);
  ctx.rotate((giroGraus * Math.PI) / 180);
  const escala = (lado * 0.86) / Math.max(img.width, img.height);
  // Rodada 74/77 — tira o branco (fundo e interior) antes de girar (imagens antigas).
  const base = document.createElement("canvas");
  base.width = Math.round(img.width * escala);
  base.height = Math.round(img.height * escala);
  base.getContext("2d")!.drawImage(img, 0, 0, base.width, base.height);
  limparBrancoTodo(base);
  ctx.drawImage(base, -base.width / 2, -base.height / 2);
  return canvas.toDataURL("image/png");
}

// SVG (texto) → PNG, opcionalmente girado.
async function svgParaPng(svg: string, lado: number, giroGraus = 0): Promise<string> {
  const img = await carregarImagem(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(lado / 2, lado / 2);
  ctx.rotate((giroGraus * Math.PI) / 180);
  const escala = 0.9;
  ctx.drawImage(img, (-lado * escala) / 2, (-lado * escala) / 2, lado * escala, lado * escala);
  return canvas.toDataURL("image/png");
}

async function carregarFontes() {
  if (typeof FontFace === "undefined") return;
  const fontes = [
    new FontFace("PlayfairCaderno", "url(/fonts/playfair-display/playfair-display-latin-800-normal.woff2)", { weight: "800" }),
    new FontFace("PlayfairCaderno", "url(/fonts/playfair-display/playfair-display-latin-700-italic.woff2)", {
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

function centralizado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, larguraMax: number) {
  // encolhe a fonte se o texto não couber
  let tamanho = parseInt(ctx.font.match(/(\d+)px/)?.[1] ?? "40", 10);
  while (ctx.measureText(texto).width > larguraMax && tamanho > 14) {
    tamanho -= 2;
    ctx.font = ctx.font.replace(/\d+px/, `${tamanho}px`);
  }
  ctx.fillText(texto, x, y);
}

// Capa desenhada num canvas A4 (1240 x 1754, 150 dpi).
async function desenharCapa(capa: CapaCaderno, qtdCarimbos: number, qtdCidades: number, qtdCheckins = 0): Promise<string> {
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const [logo, santa] = await Promise.all([carregarImagem("/icons/logo-emblema.png"), carregarImagem("/arte/santa-colorida.webp")]);

  // céu do amanhecer
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#16234a");
  g.addColorStop(0.35, "#3b2f6b");
  g.addColorStop(0.62, "#a84a6a");
  g.addColorStop(0.82, "#f08a3c");
  g.addColorStop(1, "#ffd27a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // moldura dourada
  ctx.strokeStyle = "#e5bd5a";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  // logo + nome do app
  ctx.drawImage(logo, W / 2 - 80, 110, 160, 160);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "600 34px Arial, Helvetica, sans-serif";
  ctx.fillText("O  P E R E G R I N O", W / 2, 320);

  // título
  ctx.fillStyle = "#f5d27a";
  ctx.font = "800 104px PlayfairCaderno, Georgia, serif";
  centralizado(ctx, "Caderno de Bordo", W / 2, 470, W - 200);
  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 700 46px PlayfairCaderno, Georgia, serif";
  centralizado(ctx, "Peregrinação a Aparecida", W / 2, 545, W - 200);

  // Nossa Senhora (arte do app)
  const larg = 760;
  const alt = (santa.height / santa.width) * larg;
  ctx.drawImage(santa, W / 2 - larg / 2, 600, larg, alt);

  // ano
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 150px PlayfairCaderno, Georgia, serif";
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 18;
  ctx.fillText(capa.ano, W / 2, 600 + alt + 150);
  ctx.shadowBlur = 0;

  // dados da peregrinação
  const yDados = 600 + alt + 230;
  ctx.fillStyle = "rgba(22,35,74,.55)";
  const caixaAlt = 300;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(140, yDados, W - 280, caixaAlt, 28);
    ctx.fill();
  } else {
    ctx.fillRect(140, yDados, W - 280, caixaAlt);
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 54px Arial, Helvetica, sans-serif";
  centralizado(ctx, capa.nome, W / 2, yDados + 80, W - 340);
  ctx.font = "500 38px Arial, Helvetica, sans-serif";
  centralizado(ctx, capa.origem ? `De ${capa.origem} a Aparecida-SP` : "Até Aparecida-SP", W / 2, yDados + 145, W - 340);
  if (capa.periodo) centralizado(ctx, capa.periodo, W / 2, yDados + 200, W - 340);
  ctx.fillStyle = "#f5d27a";
  ctx.font = "700 34px Arial, Helvetica, sans-serif";
  centralizado(
    ctx,
    qtdCheckins > 0
      ? `${qtdCheckins} check-in${qtdCheckins === 1 ? "" : "s"} · ${qtdCarimbos} carimbo${qtdCarimbos === 1 ? "" : "s"} de PAP · ${qtdCidades} cidade${qtdCidades === 1 ? "" : "s"}`
      : `${qtdCarimbos} carimbo${qtdCarimbos === 1 ? "" : "s"} de Pontos de Apoio · ${qtdCidades} cidade${qtdCidades === 1 ? "" : "s"}`,
    W / 2,
    yDados + 260,
    W - 340
  );
  return canvas.toDataURL("image/jpeg", 0.9);
}

function agruparPorCidade(carimbos: DadosCarimbo[]) {
  // Rodada 74 — na mesma cidade, o check-in da cidade vem antes dos PAPs.
  const ordenados = [...carimbos].sort((a, b) => a.carimbado_em.localeCompare(b.carimbado_em));
  const grupos: { cidade: string; lista: DadosCarimbo[] }[] = [];
  for (const c of ordenados) {
    const cidade = c.cidade?.trim() || "Outros pontos";
    let g = grupos.find((x) => x.cidade.toLowerCase() === cidade.toLowerCase());
    if (!g) {
      g = { cidade, lista: [] };
      grupos.push(g);
    }
    g.lista.push(c);
  }
  for (const g of grupos) g.lista.sort((a, b) => (a.tipo === "cidade" ? 0 : 1) - (b.tipo === "cidade" ? 0 : 1));
  return grupos;
}

export async function exportarCadernoPdf(carimbos: DadosCarimbo[], capa: CapaCaderno) {
  const [{ jsPDF }] = await Promise.all([import("jspdf"), carregarFontes()]);
  const grupos = agruparPorCidade(carimbos);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  // 1) capa
  const qtdCheckins = carimbos.filter((c) => c.tipo === "cidade").length;
  pdf.addImage(await desenharCapa(capa, carimbos.length - qtdCheckins, grupos.length, qtdCheckins), "JPEG", 0, 0, W, H);

  // 2) carimbos por cidade
  const fundo = () => {
    pdf.setFillColor(251, 245, 230);
    pdf.rect(0, 0, W, H, "F");
    pdf.setDrawColor(229, 189, 90);
    pdf.setLineWidth(0.8);
    pdf.rect(8, 8, W - 16, H - 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(140, 120, 90);
    pdf.text(`Caderno de bordo · ${capa.nome} · ${capa.ano}`, W / 2, 15, { align: "center" });
    pdf.text("O Peregrino", W / 2, H - 11, { align: "center" });
  };
  const LADO = 54; // mm de cada carimbo
  const COLS = 3;
  const X0 = (W - COLS * LADO - (COLS - 1) * 6) / 2;
  let y = 0;
  const novaPagina = () => {
    pdf.addPage();
    fundo();
    y = 24;
  };
  novaPagina();
  if (capa.saida) {
    let caminho: string | null = null;
    try {
      const params = new URLSearchParams({ cidade: capa.saida.cidade });
      if (capa.saida.uf) params.set("uf", capa.saida.uf);
      const r = await fetch(`/api/contorno-cidade?${params}`);
      caminho = r.ok ? ((await r.json()).caminho ?? null) : null;
    } catch {
      caminho = null;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(21, 128, 61);
    pdf.text(`Saída — ${capa.saida.cidade}`, X0, y + 6);
    pdf.setDrawColor(21, 128, 61);
    pdf.setLineWidth(0.6);
    pdf.line(X0, y + 8.5, W - X0, y + 8.5);
    y += 13;
    const png = await svgParaPng(svgCarimboSaida({ caminho, cidade: capa.saida.cidade, iso: capa.saida.iso }), 700, -4);
    pdf.addImage(png, "PNG", (W - 70) / 2, y, 70, 70);
    y += 80;
  }
  for (const g of grupos) {
    if (y + 12 + LADO > H - 18) novaPagina();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(31, 59, 107);
    pdf.text(g.cidade, X0, y + 6);
    pdf.setDrawColor(224, 137, 43);
    pdf.setLineWidth(0.6);
    pdf.line(X0, y + 8.5, W - X0, y + 8.5);
    y += 13;
    for (let i = 0; i < g.lista.length; i++) {
      const col = i % COLS;
      if (col === 0 && i > 0) y += LADO + 4;
      if (col === 0 && y + LADO > H - 18) novaPagina();
      const c = g.lista[i];
      let png: string;
      try {
        png = c.tipo === "cidade"
          ? await svgParaPng(svgCarimboCidade(c), 600, giroCarimbo(c.id))
          : c.imagem_url
          ? await imagemParaPng(c.imagem_url, 600, giroCarimbo(c.id))
          : await svgParaPng(svgCarimbo(c), 600, giroCarimbo(c.id));
      } catch {
        png = await svgParaPng(c.tipo === "cidade" ? svgCarimboCidade(c) : svgCarimbo(c), 600, giroCarimbo(c.id));
      }
      const xc = X0 + col * (LADO + 6);
      pdf.addImage(png, "PNG", xc, y, LADO, LADO);
      if (c.imagem_url && c.tipo !== "cidade") {
        const { data, hora } = dataHoraCarimbo(c.carimbado_em);
        // Rodada 78 — cidade e km também no carimbo próprio.
        const local = [c.cidade, c.km != null ? `km ${Number(c.km).toLocaleString("pt-BR")}` : null]
          .filter(Boolean)
          .join(" · ")
          .toUpperCase();
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(90, 70, 40);
        if (local) {
          pdf.setFontSize(7.5);
          pdf.text(local, xc + LADO / 2, y + LADO - 1.8, { align: "center", maxWidth: LADO });
        }
        pdf.setFontSize(8);
        pdf.text(`${data} · ${hora}`, xc + LADO / 2, y + LADO + 1.5, { align: "center" });
      }
    }
    y += LADO + 10;
  }

  // 3) carimbo de Nossa Senhora Aparecida — só depois da chegada
  if (capa.chegadaIso) {
  pdf.addPage();
  fundo();
  const santa = await dataUrlDe("/arte/santa-desenho-escuro.webp");
  // converte a imagem para PNG (alguns navegadores não desenham WebP dentro de SVG)
  const imgSanta = await carregarImagem(santa);
  const cv = document.createElement("canvas");
  cv.width = imgSanta.width;
  cv.height = imgSanta.height;
  cv.getContext("2d")!.drawImage(imgSanta, 0, 0);
  const pngSanta = await svgParaPng(svgCarimboSanta(cv.toDataURL("image/png")), 1400, -4);
  pdf.setFont("times", "bolditalic");
  pdf.setFontSize(22);
  pdf.setTextColor(31, 59, 107);
  pdf.text("Chegada", W / 2, 50, { align: "center" });
  pdf.addImage(pngSanta, "PNG", (W - 150) / 2, 62, 150, 150);
  pdf.setFont("times", "italic");
  pdf.setFontSize(14);
  pdf.setTextColor(90, 70, 40);
  const chegada = dataHoraCarimbo(capa.chegadaIso);
  pdf.text(`Chegada em Aparecida · ${chegada.data} às ${chegada.hora}`, W / 2, 228, { align: "center" });
  pdf.text(`${capa.nome} · ${capa.ano}`, W / 2, 238, { align: "center" });
  }

  const nomeArquivo = `caderno-de-bordo-${capa.ano}-${capa.nome.split(" ")[0].toLowerCase()}.pdf`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  pdf.save(nomeArquivo);
}
