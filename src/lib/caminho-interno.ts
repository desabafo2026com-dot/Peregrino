// Rodada 59 (revisão de segurança) — só aceita voltar para um caminho do
// próprio app ("/algo"). Recusa endereço externo, "//outro-site", barra
// invertida e caracteres de controle (ex.: TAB), que o navegador ignora e
// poderiam transformar o caminho num link para outro site.
export function caminhoInterno(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(valor)) return null;
  if (!valor.startsWith("/") || valor.startsWith("//")) return null;
  try {
    const base = "https://app.invalido";
    const url = new URL(valor, base);
    if (url.origin !== base) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
