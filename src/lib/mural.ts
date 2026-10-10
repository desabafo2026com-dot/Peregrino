// Rodada 65 — utilidades do mural de pedidos/agradecimentos e dos
// agradecimentos aos PAPs.
import type { ItemMural } from "@/components/MuralCarrossel";

export function autorMural(nome: string, cidade: string | null) {
  return cidade ? `${nome}, de ${cidade}` : nome;
}

export interface IntencaoMural {
  id: string;
  tipo: "pedido" | "agradecimento";
  texto: string;
  nome: string;
  cidade: string | null;
  desde: string;
}

export interface AgradecimentoPapPublico {
  id: string;
  pap_id: string | null;
  pap_nome: string;
  mensagem: string;
  nome: string;
  cidade: string | null;
  criado_em: string;
}

export function itensIntencoes(lista: IntencaoMural[]): ItemMural[] {
  return lista.map((i) => ({
    id: i.id,
    rotulo: i.tipo === "pedido" ? "Pedido" : "Agradecimento",
    texto: i.texto,
    autor: autorMural(i.nome, i.cidade),
  }));
}

export function itensAgradecimentosPap(lista: AgradecimentoPapPublico[]): ItemMural[] {
  return lista.map((a) => ({
    id: a.id,
    rotulo: a.pap_id ? `Para ${a.pap_nome}` : a.pap_nome,
    texto: a.mensagem,
    autor: autorMural(a.nome, a.cidade),
  }));
}
