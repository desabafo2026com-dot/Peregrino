// Rodada 68/71 — cartazes com QR code em meia folha A4 (2 por folha, com
// linha de corte), gerados no próprio navegador com jsPDF. Usado para os
// PAPs (admin e gerentes) e para hotéis/restaurantes.

export interface CartazQr {
  url: string; // para onde o QR leva
  rotulo: string; // ex.: "Ponto de Apoio ao Peregrino", "Hotel"
  nome: string;
  local: string; // cidade · BR-116 km X · sentido
  chamada: string; // ex.: "Peregrino, aponte a câmera do celular:"
  texto: string; // explicação curta abaixo da chamada
  codigo?: string; // código impresso abaixo do QR
}

async function imagemComoDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function gerarPdfCartazesQr(cartazes: CartazQr[], nomeArquivo: string) {
  const [{ jsPDF }, QRCode, logo] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
    imagemComoDataUrl("/icons/logo-emblema.png"),
  ]);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 148.5;
  for (let i = 0; i < cartazes.length; i++) {
    const c = cartazes[i];
    const metade = i % 2;
    if (i > 0 && metade === 0) pdf.addPage();
    const y0 = metade * H;
    const qr = await QRCode.toDataURL(c.url, { width: 900, margin: 1, color: { dark: "#1f3b6b" } });

    // faixa laranja no topo
    pdf.setFillColor(224, 137, 43);
    pdf.rect(0, y0, W, 6, "F");
    // linha de corte entre as duas metades
    if (metade === 0) {
      pdf.setDrawColor(170);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(0, H, W, H);
      pdf.setLineDashPattern([], 0);
    }

    // coluna da esquerda: logo, títulos e instruções
    pdf.addImage(logo, "PNG", 14, y0 + 14, 26, 26);
    pdf.setTextColor(31, 59, 107);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("O PEREGRINO", 44, y0 + 24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(c.rotulo, 44, y0 + 30);

    pdf.setTextColor(30, 30, 30);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    let nome = pdf.splitTextToSize(c.nome, 92) as string[];
    const nomeLongo = nome.length > 2;
    if (nomeLongo) {
      pdf.setFontSize(15);
      nome = pdf.splitTextToSize(c.nome, 92) as string[];
    }
    pdf.text(nome.slice(0, 3), 14, y0 + 54);
    const yLocal = y0 + 56 + Math.min(nome.length, 3) * (nomeLongo ? 6.5 : 8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(80);
    pdf.text(pdf.splitTextToSize(c.local, 92) as string[], 14, yLocal);

    pdf.setTextColor(184, 98, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(c.chamada, 14, y0 + 104);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(50);
    pdf.setFontSize(10.5);
    pdf.text(pdf.splitTextToSize(c.texto, 92) as string[], 14, y0 + 111);

    // QR code à direita
    pdf.addImage(qr, "PNG", 112, y0 + 22, 86, 86);
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    if (c.codigo) pdf.text(`Código ${c.codigo}`, 155, y0 + 116, { align: "center" });
    pdf.setFontSize(8);
    pdf.text(`${window.location.host} · app gratuito`, 155, y0 + 121, { align: "center" });
  }
  pdf.save(nomeArquivo);
}

export const TEXTO_CARTAZ_PAP = {
  rotulo: "Ponto de Apoio ao Peregrino",
  chamada: "Peregrino, aponte a câmera do celular:",
  texto:
    "veja as informações deste PAP e carimbe o seu caderno de bordo no app O Peregrino, com a data e a hora da sua passagem.",
};
