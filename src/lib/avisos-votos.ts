import { createClient } from "@/lib/supabase/client";

// Rodada 47 — outro peregrino pode confirmar que um aviso (riscos_informados)
// ainda está lá, ou informar que já não existe. Tudo passa pela função
// votar_aviso da Migration 41, que guarda um voto por pessoa por aviso,
// recalcula os contadores e tira o aviso do ar ao chegar a 5 "já não
// existe". Uma confirmação também renova o prazo de 1 hora do aviso.

export type TipoVotoAviso = "confirma" | "nao_existe";

export const LIMITE_NAO_EXISTE = 5;

export interface ResultadoVotoAviso {
  confirmacoes: number;
  nao_existe: number;
  removido: boolean;
  ja_tinha_votado: boolean;
}

export async function votarAviso(
  avisoId: string,
  tipo: TipoVotoAviso
): Promise<ResultadoVotoAviso | { erro: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("votar_aviso", {
    p_aviso_id: avisoId,
    p_tipo: tipo,
  });
  if (error) {
    // Sem a Migration 41 a função ainda não existe.
    if (error.code === "PGRST202") {
      return { erro: "Função ainda não disponível. Tente novamente mais tarde." };
    }
    return { erro: error.message };
  }
  const linha = (Array.isArray(data) ? data[0] : data) as ResultadoVotoAviso | null;
  if (!linha) return { erro: "Não foi possível registrar agora. Tente novamente." };
  return linha;
}
