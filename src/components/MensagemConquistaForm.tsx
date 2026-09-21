"use client";

import { useState } from "react";
import { Megaphone, CheckCircle2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MensagemConquista } from "@/types/database";

const LIMITE_CARACTERES = 220;

interface Props {
  certificadoId: string;
  userId: string;
  // Primeiro nome e cidade já computados a partir do certificado (nome do
  // peregrino na emissão + origem gravada na peregrinação) — usados como
  // prévia de como a mensagem vai aparecer no carrossel da home, e gravados
  // junto da mensagem no momento da publicação.
  nome: string;
  cidade: string | null;
  mensagemInicial: MensagemConquista | null;
}

// "Deixe sua mensagem pública sobre sua conquista para outros peregrinos!"
// (Rodada 27, pedido do usuário) — oferecido na tela do certificado, para
// quem já concluiu a peregrinação, incentivar quem ainda não terminou ou
// nem começou. Uma mensagem por certificado (upsert ao reenviar); a
// administração pode ocultar uma mensagem inadequada sem apagar o registro.
export default function MensagemConquistaForm({ certificadoId, userId, nome, cidade, mensagemInicial }: Props) {
  const [mensagem, setMensagem] = useState(mensagemInicial?.mensagem ?? "");
  const [publicada, setPublicada] = useState<MensagemConquista | null>(mensagemInicial);
  const [editando, setEditando] = useState(!mensagemInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!mensagem.trim()) {
      setErro("Escreva uma mensagem antes de publicar.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("mensagens_conquista")
      .upsert(
        {
          user_id: userId,
          certificado_id: certificadoId,
          nome,
          cidade,
          mensagem: mensagem.trim().slice(0, LIMITE_CARACTERES),
          ativo: true,
        },
        { onConflict: "certificado_id" }
      )
      .select()
      .single();
    setLoading(false);
    if (error) {
      setErro("Não foi possível publicar sua mensagem agora. Tente novamente.");
      return;
    }
    setPublicada(data as MensagemConquista);
    setEditando(false);
  }

  if (publicada && !editando) {
    return (
      <div className="card flex items-start gap-3 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={20} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            Sua mensagem está publicada para outros peregrinos!
          </p>
          <p className="mt-1 text-sm italic text-neutral-600 dark:text-neutral-300">
            &quot;{publicada.mensagem}&quot;
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            — {publicada.nome}
            {publicada.cidade ? `, de ${publicada.cidade}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-500"
          >
            <Pencil size={12} /> Editar mensagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={publicar} className="card flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
        <Megaphone size={18} /> Deixe sua mensagem pública sobre sua conquista para outros peregrinos!
      </h3>
      <p className="text-sm text-neutral-500">
        Ela aparece uma a uma na página inicial do app, junto com seu primeiro nome
        {cidade ? ` e a cidade de onde você saiu (${cidade})` : ""}, para incentivar quem ainda está
        caminhando ou vai começar.
      </p>
      <textarea
        className="input min-h-24 resize-none"
        maxLength={LIMITE_CARACTERES}
        placeholder="Ex.: Valeu a pena cada passo! Se eu consegui, você também consegue."
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />
      <p className="text-right text-xs text-neutral-400">
        {mensagem.length}/{LIMITE_CARACTERES}
      </p>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Publicando..." : "Publicar mensagem"}
        </button>
        {publicada && (
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setMensagem(publicada.mensagem);
            }}
            className="btn-secondary"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
