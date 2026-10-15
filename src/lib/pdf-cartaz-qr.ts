// Rodada 68/71/73 — cartazes com QR code em meia folha A4 (2 por folha, com
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

// Rodada 73 — folha A4 deitada (paisagem) com 2 cartazes em pé, lado a
// lado (cada um com meia folha: 148,5 x 210 mm), linha de corte no meio.
export async function gerarPdfCartazesQr(cartazes: CartazQr[], nomeArquivo: string) {
  const [{ jsPDF }, QRCode, logo] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
    imagemComoDataUrl("/icons/logo-emblema.png"),
  ]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 148.5; // largura de cada cartaz
  const H = 210;
  for (let i = 0; i < cartazes.length; i++) {
    const c = cartazes[i];
    const lado = i % 2;
    if (i > 0 && lado === 0) pdf.addPage();
    const x0 = lado * W;
    const cx = x0 + W / 2;
    const qr = await QRCode.toDataURL(c.url, { width: 900, margin: 1, color: { dark: "#1f3b6b" } });

    // faixa laranja no topo
    pdf.setFillColor(224, 137, 43);
    pdf.rect(x0, 0, W, 6, "F");
    // linha de corte entre os dois cartazes
    if (lado === 0) {
      pdf.setDrawColor(170);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(W, 0, W, H);
      pdf.setLineDashPattern([], 0);
    }

    // cabeçalho: logo + "APP - O Peregrino"
    pdf.addImage(logo, "PNG", cx - 11, 11, 22, 22);
    pdf.setTextColor(31, 59, 107);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("APP - O Peregrino", cx, 40, { align: "center" });

    // rótulo (ex.: "Ponto de Apoio ao Peregrino") junto do nome
    pdf.setTextColor(184, 98, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(c.rotulo.toUpperCase(), cx, 52, { align: "center" });
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(20);
    let nome = pdf.splitTextToSize(c.nome, W - 24) as string[];
    const nomeLongo = nome.length > 2;
    if (nomeLongo) {
      pdf.setFontSize(15);
      nome = pdf.splitTextToSize(c.nome, W - 24) as string[];
    }
    nome = nome.slice(0, 3);
    pdf.text(nome, cx, 61, { align: "center" });
    const passo = nomeLongo ? 6.2 : 8;
    let y = 61 + (nome.length - 1) * passo + 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(80);
    const local = pdf.splitTextToSize(c.local, W - 24) as string[];
    pdf.text(local, cx, y, { align: "center" });
    y += local.length * 4.6 + 3;

    // QR code
    const lado_qr = 78;
    pdf.addImage(qr, "PNG", cx - lado_qr / 2, y, lado_qr, lado_qr);
    y += lado_qr + 4;
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text([c.codigo ? `Código ${c.codigo}` : "", `${window.location.host} · app gratuito`].filter(Boolean), cx, y, {
      align: "center",
    });
    y += c.codigo ? 11 : 7;

    // chamada + texto justificado
    pdf.setTextColor(184, 98, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(c.chamada, cx, y, { align: "center" });
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(50);
    pdf.setFontSize(10.5);
    pdf.text(c.texto, x0 + 14, y, { align: "justify", maxWidth: W - 28 });
  }
  pdf.save(nomeArquivo);
}

export const TEXTO_CARTAZ_PAP = {
  rotulo: "Ponto de Apoio ao Peregrino",
  chamada: "Peregrino, aponte a câmera do celular:",
  texto:
    "veja as informações deste PAP e carimbe o seu caderno de bordo no app O Peregrino, com a data e a hora da sua passagem. Já tem o app instalado? Abra o app e toque em \"Ler QR code do PAP\" no caderno de bordo.",
};
