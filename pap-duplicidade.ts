import type { SupabaseClient } from "@supabase/supabase-js";
import type { PapPreCadastro } from "@/types/database";

// Reaproveita a mesma normalização já usada em PapPreCadastroBusca.tsx
// (tira acento/maiúsculas) para comparar nome+cidade sem depender de
// digitação idêntica.
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

interface PontoApoioResumo {
  id: string;
  nome: string;
  cidade: string | null;
  gerente_id: string | null;
}

export type ConflitoPap =
  // Já existe um pontos_apoio com esse nome/cidade, vinculado a OUTRO
  // gerente — a mensagem pedida pelo usuário: "Este PAP já foi vinculado
  // a um gerente".
  | { tipo: "vinculado"; pap: PontoApoioResumo }
  // Já existe um pontos_apoio com esse nome/cidade, mas sem nenhum
  // gerente vinculado (cadastrado direto pela administração).
  | { tipo: "sem_gerente"; pap: PontoApoioResumo }
  // Já existe na lista pública de pré-cadastro (ainda não virou um PAP de
  // verdade, ninguém reivindicou).
  | { tipo: "pre_cadastro"; preCadastro: PapPreCadastro };

// Roda só ao "cadastrar do zero" (fora da busca da lista pública) — quem
// veio de PapPreCadastroBusca.onSelecionar já está vinculando um item que,
// por definição da própria busca, ainda não tem gerente (ela só lista
// reivindicado_por is null), então não precisa passar por aqui.
export async function verificarPapDuplicado(
  supabase: SupabaseClient,
  nome: string,
  cidade: string | null,
  gerenteAtualId: string
): Promise<ConflitoPap | null> {
  const nomeNorm = normalizarTexto(nome);
  if (!nomeNorm) return null;
  const cidadeNorm = cidade ? normalizarTexto(cidade) : null;

  const bate = (n: string, c: string | null) => {
    if (normalizarTexto(n) !== nomeNorm) return false;
    if (cidadeNorm && c) return normalizarTexto(c) === cidadeNorm;
    return true;
  };

  const [{ data: pontos }, { data: preCadastros }] = await Promise.all([
    supabase.from("pontos_apoio").select("id, nome, cidade, gerente_id"),
    supabase.from("paps_pre_cadastro").select("*").is("reivindicado_por", null),
  ]);

  const pontoBatido = ((pontos ?? []) as PontoApoioResumo[]).find((p) => bate(p.nome, p.cidade));
  if (pontoBatido) {
    if (pontoBatido.gerente_id && pontoBatido.gerente_id !== gerenteAtualId) {
      return { tipo: "vinculado", pap: pontoBatido };
    }
    if (!pontoBatido.gerente_id) {
      return { tipo: "sem_gerente", pap: pontoBatido };
    }
    // gerente_id === gerenteAtualId: é o próprio PAP dela, sem conflito
    // (acontece ao editar salvando sem mudar nome/cidade).
    return null;
  }

  const preBatido = ((preCadastros ?? []) as PapPreCadastro[]).find((p) => bate(p.nome, p.cidade));
  if (preBatido) return { tipo: "pre_cadastro", preCadastro: preBatido };

  return null;
}
