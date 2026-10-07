// Rodada 61 — fotos menores antes de subir para o Supabase Storage.
//
// O app ficou 2 dias fora do ar porque estourou a cota mensal de tráfego de
// imagens do plano grátis do Supabase ("cached egress", 5 GB/mês). A maior
// parte desse tráfego eram fotos tiradas direto do celular (3–4 MB cada),
// baixadas inteiras toda vez que alguém abria uma lista. Agora toda foto é
// reduzida no próprio celular antes do envio (lado maior até `maxLado`
// pixels, JPEG) — fica com ~150–300 KB, sem diferença visível na tela.

// Guardar no navegador por 1 ano: cada foto nova ganha um endereço novo,
// então nunca fica uma versão velha presa no cache.
export const CACHE_UM_ANO = "31536000";

function carregar(arquivo: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem inválida"));
    };
    img.src = url;
  });
}

export async function comprimirImagem(
  arquivo: Blob,
  { maxLado = 1280, qualidade = 0.8 }: { maxLado?: number; qualidade?: number } = {}
): Promise<Blob> {
  // GIF animado e SVG ficam como estão.
  if (/image\/(gif|svg)/.test(arquivo.type)) return arquivo;
  let img: HTMLImageElement;
  try {
    img = await carregar(arquivo);
  } catch {
    // Formato que o navegador não abre (ex.: HEIC no Android) — envia o
    // original; o limite de tamanho do bucket continua valendo.
    return arquivo;
  }
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
  const largura = Math.max(1, Math.round(img.naturalWidth * escala));
  const altura = Math.max(1, Math.round(img.naturalHeight * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return arquivo;
  // Fundo branco (PNG com transparência vira JPEG sem ficar preto).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(img, 0, 0, largura, altura);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
  if (!blob) return arquivo;
  // Se por algum motivo ficou maior que o original (foto já pequena), usa o original.
  return blob.size < arquivo.size || escala < 1 ? blob : arquivo;
}

// Mesma coisa a partir de uma URL (ferramenta "Otimizar fotos" do admin).
export async function comprimirDeUrl(url: string, opcoes?: { maxLado?: number; qualidade?: number }) {
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`falha ao baixar (${resposta.status})`);
  const original = await resposta.blob();
  const reduzida = await comprimirImagem(original, opcoes);
  return { original, reduzida };
}
