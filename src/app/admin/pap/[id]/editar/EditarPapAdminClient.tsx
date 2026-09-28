"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PapForm, { type PapFormDados } from "@/components/PapForm";
import type { PontoApoio } from "@/types/database";

// Rodada 43 — mesmo formulário do gerente (PapForm), salvando direto na
// linha do PAP. Não mexe em status de aprovação nem no gerente vinculado:
// isso continua sendo feito pelos botões da lista em /admin/pap.
export default function EditarPapAdminClient({ ponto }: { ponto: PontoApoio }) {
  const router = useRouter();

  async function salvar(dados: PapFormDados) {
    const supabase = createClient();
    const { error } = await supabase.from("pontos_apoio").update(dados).eq("id", ponto.id);
    if (error) return { error: error.message };
    router.push("/admin/pap");
    router.refresh();
    return {};
  }

  return (
    <PapForm
      pontoInicial={ponto}
      onSalvar={salvar}
      submitLabel="Salvar alterações"
      submitLoadingLabel="Salvando..."
    />
  );
}
