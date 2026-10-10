"use client";

import { useMemo, useState } from "react";
import { Heart, Check, Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Rodada 65 — depois de concluir: agradecer a um PAP (ou a todos os PAPs do
// caminho). As mensagens aparecem alternando na página inicial, abaixo dos
// números de PAP, e na página de cada PAP.
export interface OpcaoPap {
  chave: string; // "pap:<id>" ou "pre:<id>"
  papId: string | null;
  nome: string; // como aparece ("PAP Mãezinha do Céu (Guarulhos)")
}

export interface AgradecimentoEnviado {
  id: string;
  pap_nome: string;
  mensagem: string;
  ativo: boolean;
}

const TODOS = "Todos os PAPs do caminho";

function normalizar(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function AgradecimentoPapForm({
  certificadoId,
  userId,
  opcoes,
  enviadosIniciais,
}: {
  certificadoId: string;
  userId: string;
  opcoes: OpcaoPap[];
  enviadosIniciais: AgradecimentoEnviado[];
}) {
  const [enviados, setEnviados] = useState(enviadosIniciais);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<OpcaoPap | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    const base = termo ? opcoes.filter((o) => normalizar(o.nome).includes(termo)) : opcoes;
    return base.slice(0, 8);
  }, [busca, opcoes]);

  async function enviar() {
    setAviso(null);
    if (!escolhido) {
      setAviso({ ok: false, texto: "Escolha o PAP (ou “Todos os PAPs do caminho”)." });
      return;
    }
    if (!mensagem.trim()) {
      setAviso({ ok: false, texto: "Escreva sua mensagem de agradecimento." });
      return;
    }
    setSalvando(true);
    const { data, error } = await createClient()
      .from("agradecimentos_pap")
      .insert({
        user_id: userId,
        certificado_id: certificadoId,
        pap_id: escolhido.papId,
        pap_nome: escolhido.nome,
        mensagem: mensagem.trim(),
      })
      .select("id, pap_nome, mensagem, ativo")
      .single();
    setSalvando(false);
    if (error || !data) {
      setAviso({
        ok: false,
        texto: error?.code === "23505" ? "Você já agradeceu a este PAP nesta peregrinação." : "Não foi possível enviar agora.",
      });
      return;
    }
    setEnviados((e) => [data as AgradecimentoEnviado, ...e]);
    setMensagem("");
    setEscolhido(null);
    setBusca("");
    setAviso({ ok: true, texto: "Obrigado! Sua mensagem já aparece no mural de agradecimentos." });
  }

  async function apagar(id: string) {
    if (!confirm("Apagar este agradecimento?")) return;
    const { error } = await createClient().from("agradecimentos_pap").delete().eq("id", id);
    if (!error) setEnviados((e) => e.filter((x) => x.id !== id));
  }

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-green-800 dark:text-green-400">
        <Heart size={20} /> Agradeça a um Ponto de Apoio
      </h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
        Algum PAP fez diferença na sua caminhada? Deixe uma mensagem. Ela aparece na página inicial do app e na
        página do PAP, com seu primeiro nome e cidade.
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setEscolhido({ chave: "todos", papId: null, nome: TODOS });
            setBusca("");
          }}
          className={`w-fit rounded-lg px-3 py-1.5 text-sm font-semibold ${
            escolhido?.chave === "todos" ? "bg-green-700 text-white" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {TODOS}
        </button>
        {escolhido && escolhido.chave !== "todos" ? (
          <p className="flex items-center gap-2 text-sm">
            <span className="rounded-lg bg-green-700 px-3 py-1.5 font-semibold text-white">{escolhido.nome}</span>
            <button type="button" onClick={() => setEscolhido(null)} className="text-xs text-neutral-500 underline">
              trocar
            </button>
          </p>
        ) : (
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
            <input
              className="input"
              style={{ paddingLeft: "2.25rem" }}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ou busque o PAP pelo nome ou cidade"
            />
            {busca.trim() && (
              <ul className="mt-1 flex flex-col rounded-lg border border-neutral-200 dark:border-neutral-800">
                {filtradas.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">Nenhum PAP encontrado.</li>}
                {filtradas.map((o) => (
                  <li key={o.chave}>
                    <button
                      type="button"
                      onClick={() => setEscolhido(o)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-950/40"
                    >
                      {o.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <textarea
        className="input"
        rows={3}
        maxLength={220}
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="Ex.: Obrigado pela água gelada e pelo carinho às 3h da manhã!"
      />
      <p className="-mt-2 text-xs text-neutral-400" style={{ textAlign: "right" }}>{mensagem.length}/220</p>
      {aviso && (
        <p className={`flex items-center gap-1 text-sm ${aviso.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
          {aviso.ok && <Check size={14} />} {aviso.texto}
        </p>
      )}
      <button type="button" onClick={enviar} disabled={salvando} className="btn-primary w-fit">
        {salvando ? "Enviando..." : "Enviar agradecimento"}
      </button>

      {enviados.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <p className="text-xs font-bold tracking-wide text-neutral-500 uppercase">Seus agradecimentos</p>
          {enviados.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0">
                <strong>{a.pap_nome}:</strong> {a.mensagem}
                {!a.ativo && <span className="ml-1 text-xs text-red-600">(oculto pela administração)</span>}
              </span>
              <button
                type="button"
                onClick={() => apagar(a.id)}
                className="shrink-0 text-red-600"
                aria-label="Apagar agradecimento"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
