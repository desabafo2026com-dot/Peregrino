"use client";

import { createClient } from "@/lib/supabase/client";
import EditorCarimboImagem from "@/components/EditorCarimboImagem";

// Rodada 77 — o gerente define o carimbo virtual do seu PAP: foto do
// carimbo de verdade (ou uma imagem), que o app transforma em carimbo.
export default function GerenteCarimboPap({
  papId,
  userId,
  token,
  urlAtual,
  nome,
  cidade,
  km,
}: {
  papId: string;
  userId: string;
  token: string;
  urlAtual: string | null;
  nome: string;
  cidade: string | null;
  km: number | null;
}) {
  async function salvarUrl(url: string | null) {
    const { error } = await createClient().rpc("gerente_definir_carimbo", { p_pap_id: papId, p_url: url ?? "" });
    if (error) throw error;
  }
  return (
    <EditorCarimboImagem
      nome={nome}
      cidade={cidade}
      km={km}
      urlAtual={urlAtual}
      pastaUpload={`gerente/${userId}`}
      prefixoArquivo={token}
      salvarUrl={salvarUrl}
    />
  );
}
