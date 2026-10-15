"use client";

import { useState } from "react";
import { HandHeart, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Rodada 65 — pedido ou agradecimento (intenção) da peregrinação, opcional.
// Com a autorização, vai para o mural público a partir do início da
// caminhada (primeiro nome e cidade, vindos do perfil).
export interface IntencaoAtual {
  id: string;
  tipo: "pedido" | "agradecimento";
  texto: string;
  publico: boolean;
  ativo: boolean;
}

export default function IntencaoForm({
  peregrinacaoId,
  userId,
  inicial,
}: {
  peregrinacaoId: string;
  userId: string;
  inicial: IntencaoAtual | null;
}) {
  const [atual, setAtual] = useState(inicial);
  const [tipo, setTipo] = useState<IntencaoAtual["tipo"]>(inicial?.tipo ?? "pedido");
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [publico, setPublico] = useState(inicial?.publico ?? false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aberto, setAberto] = useState(!!inicial);

  async function salvar() {
    setAviso(null);
    if (!texto.trim()) {
      setAviso({ ok: false, texto: "Escreva seu pedido ou agradecimento." });
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    const dados = { tipo, texto: texto.trim(), publico, atualizado_em: new Date().toISOString() };
    const resp = atual
      ? await supabase.from("intencoes_peregrinacao").update(dados).eq("id", atual.id).select("*").single()
      : await supabase
          .from("intencoes_peregrinacao")
          .insert({ ...dados, peregrinacao_id: peregrinacaoId, user_id: userId })
          .select("*")
          .single();
    setSalvando(false);
    if (resp.error || !resp.data) {
      setAviso({ ok: false, texto: "Não foi possível salvar agora. Tente novamente." });
      return;
    }
    setAtual(resp.data as IntencaoAtual);
    setAviso({
      ok: true,
      texto: publico
        ? "Salvo! Vai aparecer no mural assim que você iniciar a peregrinação."
        : "Salvo! Fica só com você (não vai para o mural).",
    });
  }

  async function apagar() {
    if (!atual || !confirm("Apagar seu pedido/agradecimento?")) return;
    const { error } = await createClient().from("intencoes_peregrinacao").delete().eq("id", atual.id);
    if (error) return;
    setAtual(null);
    setTexto("");
    setPublico(false);
    setAviso({ ok: true, texto: "Apagado." });
  }

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
        <HandHeart size={20} /> Pedido ou agradecimento <span className="text-xs font-normal text-neutral-500">(opcional)</span>
      </h2>
      {!aberto ? (
        <>
          <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
            Por quem ou pelo que você vai caminhar? Se quiser, escreva seu pedido ou agradecimento e deixe no
            mural para outros peregrinos rezarem com você.
          </p>
          <button type="button" onClick={() => setAberto(true)} className="btn-secondary w-fit">
            Escrever meu pedido ou agradecimento
          </button>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            {(
              [
                ["pedido", "Pedido"],
                ["agradecimento", "Agradecimento"],
              ] as const
            ).map(([v, r]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTipo(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  tipo === v ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            rows={3}
            maxLength={280}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              tipo === "pedido" ? "Ex.: Pela saúde da minha mãe." : "Ex.: Pela graça alcançada no nascimento do meu filho."
            }
          />
          <p className="-mt-2 text-xs text-neutral-400" style={{ textAlign: "right" }}>{texto.length}/280</p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
            <span>
              Autorizo mostrar no <strong>mural de pedidos e agradecimentos</strong>, com meu primeiro nome e cidade.
              Aparece só depois que eu iniciar a peregrinação.
            </span>
          </label>
          <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
            Depois que a peregrinação terminar, ela fica em Meu painel → Minhas mensagens, onde dá para editar ou apagar.
          </p>
          {atual && !atual.ativo && (
            <p className="text-xs text-red-600">A administração ocultou esta mensagem do mural.</p>
          )}
          {aviso && (
            <p className={`flex items-center gap-1 text-sm ${aviso.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
              {aviso.ok && <Check size={14} />} {aviso.texto}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={salvar} disabled={salvando} className="btn-primary">
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            {atual && (
              <button
                type="button"
                onClick={apagar}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} /> Apagar
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
