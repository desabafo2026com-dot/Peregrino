"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Trash2, Send } from "lucide-react";

export interface AvisoAdmin {
  id: string;
  titulo: string;
  mensagem: string;
  criado_em: string;
  expira_em: string | null;
}

type Duracao = "horas" | "dias" | "fixo";

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Rodada 45 — cadastro e remoção dos avisos gerais. A validade é gravada
// como um instante absoluto (expira_em): "por horas" e "por dias" contam a
// partir de agora; "fixo" deixa em branco e o aviso só sai quando for
// apagado aqui.
export default function AvisosAdminClient({ avisosIniciais }: { avisosIniciais: AvisoAdmin[] }) {
  const [avisos, setAvisos] = useState(avisosIniciais);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [duracao, setDuracao] = useState<Duracao>("dias");
  const [quantidade, setQuantidade] = useState("1");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [agora] = useState(() => Date.now());

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    if (!titulo.trim() || !mensagem.trim()) {
      setErro("Preencha o título e a mensagem.");
      return;
    }
    let expiraEm: string | null = null;
    if (duracao !== "fixo") {
      const n = Number(quantidade);
      if (!Number.isFinite(n) || n <= 0) {
        setErro(`Informe por quantas ${duracao} o aviso fica no ar.`);
        return;
      }
      const ms = duracao === "horas" ? n * 60 * 60 * 1000 : n * 24 * 60 * 60 * 1000;
      expiraEm = new Date(Date.now() + ms).toISOString();
    }
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("avisos_gerais")
      .insert({ titulo: titulo.trim(), mensagem: mensagem.trim(), expira_em: expiraEm })
      .select("id, titulo, mensagem, criado_em, expira_em")
      .single();
    setEnviando(false);
    if (error) {
      setErro("Não foi possível publicar: " + error.message);
      return;
    }
    setAvisos((prev) => [data as AvisoAdmin, ...prev]);
    setTitulo("");
    setMensagem("");
    setOk(true);
  }

  async function apagar(a: AvisoAdmin) {
    if (!confirm(`Apagar o aviso "${a.titulo}"? Ele some do app para todo mundo.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("avisos_gerais").delete().eq("id", a.id);
    if (error) {
      alert("Não foi possível apagar: " + error.message);
      return;
    }
    setAvisos((prev) => prev.filter((x) => x.id !== a.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={publicar} className="card flex flex-col gap-4">
        <h3 className="flex items-center gap-2 font-bold">
          <Bell size={18} className="text-amber-700" /> Novo aviso
        </h3>
        <div>
          <label className="label">Título</label>
          <input
            className="input"
            maxLength={120}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Chuva forte prevista para sábado"
          />
        </div>
        <div>
          <label className="label">Mensagem</label>
          <textarea
            className="input"
            style={{ minHeight: "120px" }}
            maxLength={2000}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Escreva o aviso para todos os peregrinos e gerentes..."
          />
          <p className="mt-1 text-right text-xs text-neutral-400">{mensagem.length}/2000</p>
        </div>
        <div>
          <label className="label">Por quanto tempo fica no ar?</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["horas", "Por horas"],
                ["dias", "Por dias"],
                ["fixo", "Fixo até eu apagar"],
              ] as [Duracao, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setDuracao(valor)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  duracao === valor
                    ? "bg-amber-800 text-white"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {duracao !== "fixo" && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="input"
                style={{ width: "6rem" }}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-300">{duracao}</span>
            </div>
          )}
        </div>
        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {erro}
          </p>
        )}
        {ok && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
            Aviso publicado! Ele já aparece para todos no sininho do topo.
          </p>
        )}
        <button type="submit" disabled={enviando} className="btn-primary flex items-center justify-center gap-2">
          <Send size={16} /> {enviando ? "Publicando..." : "Publicar para todos"}
        </button>
      </form>

      <section>
        <h3 className="mb-2 text-sm font-bold tracking-wide text-neutral-500 uppercase">
          Avisos publicados ({avisos.length})
        </h3>
        <div className="flex flex-col gap-2">
          {avisos.length === 0 && <p className="text-sm text-neutral-400">Nenhum aviso publicado ainda.</p>}
          {avisos.map((a) => {
            const vencido = a.expira_em != null && new Date(a.expira_em).getTime() <= agora;
            return (
              <div key={a.id} className={`card ${vencido ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.titulo}</p>
                    <p className="mt-1 text-sm whitespace-pre-line text-neutral-600 dark:text-neutral-300">
                      {a.mensagem}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      Publicado em {dataHora(a.criado_em)} —{" "}
                      {a.expira_em == null ? (
                        <strong className="text-amber-700 dark:text-amber-500">fixo até apagar</strong>
                      ) : vencido ? (
                        <strong>encerrado em {dataHora(a.expira_em)}</strong>
                      ) : (
                        <strong className="text-green-700 dark:text-green-400">no ar até {dataHora(a.expira_em)}</strong>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => apagar(a)}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={14} /> Apagar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
