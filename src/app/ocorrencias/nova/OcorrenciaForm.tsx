"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PERIODOS_DIA, SENTIDO_PISTA_LABELS, TIPOS_OCORRENCIA_DUTRA, TIPO_OCORRENCIA_LABELS } from "@/lib/constants";
import { dataBR, hojeISO } from "@/lib/datas-br";

export interface MinhaOcorrencia {
  id: string;
  tipo: string;
  data_ocorrido: string;
  km: number | null;
  cidade: string | null;
  descricao: string;
  status: "pendente" | "aprovado" | "rejeitado";
}

const STATUS_LABEL: Record<MinhaOcorrencia["status"], string> = {
  pendente: "Em análise",
  aprovado: "Publicada",
  rejeitado: "Não publicada",
};

export default function OcorrenciaForm({ userId, minhasIniciais }: { userId: string; minhasIniciais: MinhaOcorrencia[] }) {
  const [minhas, setMinhas] = useState(minhasIniciais);
  const [tipo, setTipo] = useState("acidente");
  const [data, setData] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [km, setKm] = useState("");
  const [sentido, setSentido] = useState("");
  const [cidade, setCidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [envolveuPeregrino, setEnvolveuPeregrino] = useState(false);
  const [ciente, setCiente] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const hoje = hojeISO();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (!data || data > hoje) return setAviso({ ok: false, texto: "Informe a data (não pode ser no futuro)." });
    if (descricao.trim().length < 10) return setAviso({ ok: false, texto: "Descreva o que aconteceu (mínimo 10 letras)." });
    const kmNum = km.trim() ? Number(km.replace(",", ".")) : null;
    if (kmNum != null && (Number.isNaN(kmNum) || kmNum < 0 || kmNum > 500)) {
      return setAviso({ ok: false, texto: "O km deve ser um número entre 0 e 500." });
    }
    if (!ciente) return setAviso({ ok: false, texto: "Confirme que entendeu que isto não é boletim de ocorrência." });
    setSalvando(true);
    const { data: nova, error } = await createClient()
      .from("ocorrencias_dutra")
      .insert({
        user_id: userId,
        tipo,
        data_ocorrido: data,
        periodo: periodo || null,
        km: kmNum,
        sentido_pista: sentido || null,
        cidade: cidade.trim() || null,
        descricao: descricao.trim(),
        envolveu_peregrino: envolveuPeregrino,
      })
      .select("id, tipo, data_ocorrido, km, cidade, descricao, status")
      .single();
    setSalvando(false);
    if (error || !nova) return setAviso({ ok: false, texto: error?.message ?? "Não foi possível enviar agora." });
    setMinhas((m) => [nova as MinhaOcorrencia, ...m]);
    setDescricao("");
    setKm("");
    setCidade("");
    setData("");
    setPeriodo("");
    setSentido("");
    setEnvolveuPeregrino(false);
    setCiente(false);
    setAviso({
      ok: true,
      texto: "Recebido, obrigado! A administração vai analisar e, se aprovar, a ocorrência aparece na lista pública (sem o seu nome).",
    });
  }

  async function apagar(id: string) {
    if (!confirm("Apagar esta ocorrência?")) return;
    const { error } = await createClient().from("ocorrencias_dutra").delete().eq("id", id);
    if (!error) setMinhas((m) => m.filter((o) => o.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={enviar} className="card flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          O que aconteceu?
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_OCORRENCIA_DUTRA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Data
            <input type="date" className="input" max={hoje} min="1950-01-01" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Período
            <select className="input" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="">Não sei</option>
              {PERIODOS_DIA.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Km da Dutra
            <input
              className="input"
              inputMode="decimal"
              placeholder="Ex.: 120"
              value={km}
              onChange={(e) => setKm(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sentido
            <select className="input" value={sentido} onChange={(e) => setSentido(e.target.value)}>
              <option value="">Não sei</option>
              {Object.entries(SENTIDO_PISTA_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Cidade ou referência
          <input
            className="input"
            maxLength={80}
            placeholder="Ex.: Taubaté, perto do posto X"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Descreva o que aconteceu
          <textarea
            className="input"
            rows={4}
            maxLength={1000}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Conte o que aconteceu e o que outros peregrinos devem cuidar naquele ponto. Não coloque nomes nem dados de outras pessoas."
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={envolveuPeregrino} onChange={(e) => setEnvolveuPeregrino(e.target.checked)} />
          Envolveu peregrino(s)
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={ciente} onChange={(e) => setCiente(e.target.checked)} />
          <span style={{ textAlign: "left" }}>
            Entendi que isto <strong>não é boletim de ocorrência</strong>. Se houve crime, vou procurar a Polícia Civil.
          </span>
        </label>
        {aviso && (
          <p className={`flex items-start gap-1 text-sm ${aviso.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
            {aviso.ok && <Check size={16} className="mt-0.5 shrink-0" />} {aviso.texto}
          </p>
        )}
        <button type="submit" disabled={salvando} className="btn-primary">
          {salvando ? "Enviando..." : "Enviar ocorrência"}
        </button>
      </form>

      {minhas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Minhas ocorrências registradas</h2>
          {minhas.map((o) => (
            <div key={o.id} className="card flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">
                  {TIPO_OCORRENCIA_LABELS[o.tipo] ?? o.tipo} · {dataBR(o.data_ocorrido)}
                  {o.km != null ? ` · km ${o.km}` : ""}
                </p>
                <p className="text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
                  {o.descricao}
                </p>
                <p className="mt-1 text-xs font-semibold text-neutral-500">{STATUS_LABEL[o.status]}</p>
              </div>
              {o.status === "pendente" && (
                <button type="button" onClick={() => apagar(o.id)} className="shrink-0 text-red-600" aria-label="Apagar">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <Link href="/ocorrencias" className="btn-secondary text-center">
        Ver ocorrências publicadas
      </Link>
    </div>
  );
}
