// Validação simples de nome completo: exige pelo menos duas palavras
// (nome + sobrenome), cada uma com 2+ letras.
export function validarNomeCompleto(nome: string): string | null {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  if (partes.length < 2) {
    return "Informe o nome completo (nome e sobrenome).";
  }
  return null;
}
