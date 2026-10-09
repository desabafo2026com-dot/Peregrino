// Rodada 62 — redes sociais do PAP (texto livre digitado pelo gerente:
// "instagram.com/meupap, @meupap, facebook.com/..."). Vira uma lista de
// itens; os que são endereço de site viram link.

export interface ItemRedeSocial {
  texto: string;
  href: string | null;
}

export function itensRedesSociais(texto: string | null | undefined): ItemRedeSocial[] {
  if (!texto) return [];
  return texto
    .split(/[\n,;]+|\s{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => {
      const semEspaco = t.replace(/\s+/g, "");
      let href: string | null = null;
      if (/^https?:\/\/[^\s]+\.[^\s]+/i.test(semEspaco)) href = semEspaco;
      else if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(semEspaco)) href = `https://${semEspaco}`;
      // Só http(s) — nada de "javascript:" etc.
      if (href && !/^https?:\/\//i.test(href)) href = null;
      return { texto: t.replace(/^https?:\/\//i, "").replace(/\/$/, ""), href };
    });
}
