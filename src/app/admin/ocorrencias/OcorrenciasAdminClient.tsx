"use client";

import { useState } from "react";
import { Check, X, Megaphone, Trash2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PERIODO_DIA_LABELS, SENTIDO_PISTA_LABELS, TIPO_OCORRENCIA_LABELS } from "@/lib/constants";
import { dataBR, dataHoraBR } from "@/lib/datas-br";

export interface OcorrenciaAdmin {
  id: string;
  tipo: string;
  data_ocorrido: string;
  periodo: string | null;
  km: number | null;
  sentido_pista: string | null;
  cidade: string | null;
  descricao: string;
  envolveu_peregrino: boolean;
  status: "pendente" | "aprovado" | "rejeitado";
  comunicado_autoridades: boolean;
  comunicado_em: string | null;
  observacao_admin: string | null;
  criado_em: string;
}

const STATUS: Record<OcorrenciaAdmin["status"], { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Aguardando análise", cor: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  aprovado: { rotulo: "Publicada", cor: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  rejeitado: { rotulo: "Não publicada", cor: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
};

export default function OcorrenciasAdminClient({ iniciais }: { iniciais: OcorrenciaAdmin[] }) {
  const [lista, setLista] = useState(iniciais);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function atualizar(id: string, dados: Partial<OcorrenciaAdmin>) {
    setErro(null);
    const { error } = await createClient().from("ocorrencias_dutra").update(dados).eq("id", id);
    if (error) return setErro(error.message);
    setLista((l) => l.map((o) => (o.id === id ? { ...o, ...dados } : o)));
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta ocorrência para sempre?")) return;
    const { error } = await createClient().from("ocorrencias_dutra").delete().eq("id", id);
    if (error) return setErro(error.message);
    setLista((l) => l.filter((o) => o.id !== id));
  }

  if (lista.length === 0) return <p className="text-sm text-neutral-500">Nenhuma ocorrência registrada ainda.</p>;

  return (
    <div className="flex flex-col gap-3">
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {lista.map((o) => (
        <div key={o.id} className="card flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[o.status].cor}`}>{STATUS[o.status].rotulo}</span>
            {o.comunicado_autoridades && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Comunicada às autoridades{o.comunicado_em ? ` em ${dataHoraBR(o.comunicado_em)}` : ""}
              </span>
            )}
            <strong>{TIPO_OCORRENCIA_LABELS[o.tipo] ?? o.tipo}</strong>
          </div>
          <p className="text-xs text-neutral-500">
            Ocorrido em {dataBR(o.data_ocorrido)}
            {o.periodo ? ` (${PERIODO_DIA_LABELS[o.periodo]})` : ""}
            {o.km != null ? ` · km ${o.km}` : ""}
            {o.sentido_pista ? ` · ${SENTIDO_PISTA_LABELS[o.sentido_pista]}` : ""}
            {o.cidade ? ` · ${o.cidade}` : ""}
            {o.envolveu_peregrino ? " · envolveu peregrino" : ""} · registrada em {dataHoraBR(o.criado_em)}
          </p>
          {editando === o.id ? (
            <div className="flex flex-col gap-2">
              <textarea className="input" rows={4} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} />
              <input
                className="input"
                placeholder="Observação interna (ex.: para quem foi comunicado)"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    await atualizar(o.id, { descricao: texto.trim(), observacao_admin: obs.trim() || null });
                    setEditando(null);
                  }}
                >
                  Salvar texto
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm" style={{ textAlign: "left" }}>
                {o.descricao}
              </p>
              {o.observacao_admin && <p className="text-xs text-neutral-500 italic">Obs.: {o.observacao_admin}</p>}
            </>
          )}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {o.status !== "aprovado" && (
              <button
                type="button"
                onClick={() => atualizar(o.id, { status: "aprovado" })}
                className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-green-800 dark:bg-green-950 dark:text-green-300"
              >
                <Check size={14} /> Publicar
              </button>
            )}
            {o.status !== "rejeitado" && (
              <button
                type="button"
                onClick={() => atualizar(o.id, { status: "rejeitado" })}
                className="flex items-center gap-1 rounded-lg bg-neutral-200 px-2 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <X size={14} /> {o.status === "aprovado" ? "Despublicar" : "Não publicar"}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                atualizar(
                  o.id,
                  o.comunicado_autoridades
                    ? { comunicado_autoridades: false, comunicado_em: null }
                    : { comunicado_autoridades: true, comunicado_em: new Date().toISOString() }
                )
              }
              className="flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              <Megaphone size={14} /> {o.comunicado_autoridades ? "Desmarcar comunicado" : "Marcar: comunicado às autoridades"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(o.id);
                setTexto(o.descricao);
                setObs(o.observacao_admin ?? "");
              }}
              className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 dark:border-neutral-700"
            >
              <Pencil size={14} /> Editar texto
            </button>
            <button
              type="button"
              onClick={() => excluir(o.id)}
              className="flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-red-700"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
