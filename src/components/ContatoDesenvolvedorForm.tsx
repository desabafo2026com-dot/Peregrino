"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_MENSAGEM_CONTATO_LABELS } from "@/lib/constants";
import { MessageCircle, Send, CheckCircle2, Clock, Reply } from "lucide-react";
import type { MensagemContato } from "@/types/database";

const STATUS_ICON: Record<string, React.ElementType> = {
  novo: Clock,
  lida: Clock,
  respondida: CheckCircle2,
};

const STATUS_COLOR: Record<string, string> = {
  novo: "text-amber-700 dark:text-amber-500",
  lida: "text-amber-700 dark:text-amber-500",
  respondida: "text-green-700 dark:text-green-400",
};

export default function ContatoDesenvolvedorForm({
  userId,
  mensagensIniciais,
}: {
  userId: string;
  mensagensIniciais: MensagemContato[];
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    if (!mensagem.trim()) {
      setErro("Escreva sua mensagem antes de enviar.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("mensagens_contato")
      .insert({ user_id: userId, assunto: assunto.trim() || null, mensagem: mensagem.trim() })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setMensagens((prev) => [data as MensagemContato, ...prev]);
    setAssunto("");
    setMensagem("");
    setSucesso(true);
  }

  return (
    <section className="card">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
        <MessageCircle size={18} /> Falar com o desenvolvedor
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        Encontrou um problema, tem uma sugestão ou dúvida sobre o app? Escreva
        aqui — a administração vê e responde direto nesta tela.
      </p>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3">
        <div>
          <label className="label">Assunto (opcional)</label>
          <input
            className="input"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Ex: sugestão, bug no mapa, dúvida sobre certificado..."
          />
        </div>
        <div>
          <label className="label">Mensagem</label>
          <textarea
            required
            className="input"
            rows={4}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Conte com detalhes o que aconteceu ou o que você gostaria de sugerir..."
          />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {sucesso && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Mensagem enviada! Você pode acompanhar a resposta aqui embaixo.
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
          <Send size={16} /> {loading ? "Enviando..." : "Enviar mensagem"}
        </button>
      </form>

      {mensagens.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-500">Suas mensagens</h3>
          {mensagens.map((m) => {
            const Icon = STATUS_ICON[m.status];
            return (
              <div key={m.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{m.assunto || "Sem assunto"}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[m.status]}`}>
                    <Icon size={13} /> {STATUS_MENSAGEM_CONTATO_LABELS[m.status] ?? m.status}
                  </span>
                </p>
                <p className="mt-1 text-neutral-600 dark:text-neutral-300">{m.mensagem}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {new Date(m.criado_em).toLocaleString("pt-BR")}
                </p>
                {m.resposta_admin && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
                    <Reply size={14} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-500" />
                    <p className="text-neutral-700 dark:text-neutral-200">{m.resposta_admin}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
