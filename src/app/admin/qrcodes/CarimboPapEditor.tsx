"use client";

import { createClient } from "@/lib/supabase/client";
import EditorCarimboImagem from "@/components/EditorCarimboImagem";

// Rodada 72 — o administrador vê como fica o carimbo virtual deste PAP no
// caderno de bordo e pode trocar por uma imagem própria.
// Rodada 77 — foto do carimbo de verdade ou qualquer imagem vira carimbo
// (fundo e branco de dentro somem, tinta numa cor), com prévia.
export default function CarimboPapEditor({
  token,
  nome,
  cidade,
  km,
  urlInicial,
  onMudou,
}: {
  token: string;
  nome: string;
  cidade: string | null;
  km: number | null;
  urlInicial: string | null;
  onMudou: (url: string | null) => void;
}) {
  async function salvarUrl(novaUrl: string | null) {
    const { error } = await createClient().rpc("admin_definir_carimbo", { p_token: token, p_url: novaUrl ?? "" });
    if (error) throw error;
    onMudou(novaUrl);
  }

  return (
    <div className="border-t border-neutral-100 bg-amber-50/40 px-3 py-4 dark:border-neutral-800 dark:bg-amber-950/10">
      <EditorCarimboImagem
        nome={nome}
        cidade={cidade}
        km={km}
        urlAtual={urlInicial}
        pastaUpload="admin"
        prefixoArquivo={token}
        salvarUrl={salvarUrl}
      />
    </div>
  );
}
