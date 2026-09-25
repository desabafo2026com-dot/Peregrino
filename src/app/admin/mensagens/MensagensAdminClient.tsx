"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_MENSAGEM_CONTATO_LABELS } from "@/lib/constants";
import { MessageCircle, Clock, CheckCircle2, Reply, Eye } from "lucide-react";
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

function MensagemCard({
  m,
  nome,
  cidade,
  onMarcarLida,
  onResponder,
}: {
  m: MensagemContato;
  nome: string;
  cidade: string | null;
  onMarcarLida: (id: string) => void;
  onResponder: (id: string, resposta: string) => void;
}) {
  const [respondendo, setRespondendo] = useState(false);
  const [resposta, setResposta] = useState(m.resposta_admin ?? "");
  const Icon = STATUS_ICON[m.status];

  return (
    <div className="card">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {nome}
          {cidade ? `, de ${cidade}` : ""} — {m.assunto || "Sem assunto"}
        </span>
        <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[m.status]}`}>
          <Icon size={13} /> {STATUS_MENSAGEM_CONTATO_LABELS[m.status] ?? m.status}
        </span>
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{m.mensagem}</p>
      <p className="mt-1 text-xs text-neutral-400">{new Date(m.criado_em).toLocaleString("pt-BR")}</p>

      {m.resposta_admin && !respondendo && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
          <Reply size={14} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-500" />
          <p className="text-neutral-700 dark:text-neutral-200">{m.resposta_admin}</p>
        </div>
      )}

      {respondendo ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            className="input"
            rows={3}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Escreva sua resposta..."
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRespondendo(false)} className="btn-secondary text-xs">
              Cancelar
            </button>
            <button
              onClick={() => {
                onResponder(m.id, resposta);
                setRespondendo(false);
              }}
              disabled={!resposta.trim()}
              className="btn-primary text-xs"
            >
              Enviar resposta
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.status === "novo" && (
            <button
              onClick={() => onMarcarLida(m.id)}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <Eye size={14} /> Marcar como lida
            </button>
          )}
          <button
            onClick={() => setRespondendo(true)}
            className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <Reply size={14} /> {m.resposta_admin ? "Editar resposta" : "Responder"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MensagensAdminClient({
  mensagensIniciais,
  nomePorUsuario,
  cidadePorUsuario,
}: {
  mensagensIniciais: MensagemContato[];
  nomePorUsuario: Record<string, string>;
  cidadePorUsuario: Record<string, string>;
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);

  async function marcarLida(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("mensagens_contato").update({ status: "lida" }).eq("id", id);
    if (!error) {
      setMensagens((prev) => prev.map((m) => (m.id === id ? { ...m, status: "lida" } : m)));
    }
  }

  async function responder(id: string, resposta: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("mensagens_contato")
      .update({
        status: "respondida",
        resposta_admin: resposta,
        respondido_por: user?.id,
        respondido_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (!error) {
      setMensagens((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status: "respondida", resposta_admin: resposta } : m
        )
      );
    }
  }

  const naoLidas = mensagens.filter((m) => m.status === "novo");
  const outras = mensagens.filter((m) => m.status !== "novo");

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-500">
          <MessageCircle size={16} /> Novas ({naoLidas.length})
        </h3>
        <div className="flex flex-col gap-2">
          {naoLidas.map((m) => (
            <MensagemCard
              key={m.id}
              m={m}
              nome={nomePorUsuario[m.user_id] ?? "Peregrino"}
              cidade={cidadePorUsuario[m.user_id] ?? null}
              onMarcarLida={marcarLida}
              onResponder={responder}
            />
          ))}
          {naoLidas.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhuma mensagem nova.</p>
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-500">
          Demais mensagens
        </h3>
        <div className="flex flex-col gap-2">
          {outras.map((m) => (
            <MensagemCard
              key={m.id}
              m={m}
              nome={nomePorUsuario[m.user_id] ?? "Peregrino"}
              cidade={cidadePorUsuario[m.user_id] ?? null}
              onMarcarLida={marcarLida}
              onResponder={responder}
            />
          ))}
          {outras.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhuma outra mensagem.</p>
          )}
        </div>
      </section>
    </div>
  );
}
