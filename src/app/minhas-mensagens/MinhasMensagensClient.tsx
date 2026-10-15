"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Trash2, Globe, Lock, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface MensagemMinha {
  origem: "intencao" | "agradecimento_pap";
  id: string;
  tipo: "pedido" | "agradecimento";
  texto: string;
  publico: boolean;
  ativo: boolean;
  quando: string;
  ano: string;
  contexto: string;
  statusPeregrinacao: string | null;
}

function situacao(m: MensagemMinha): { icone: typeof Globe; texto: string; cor: string } {
  if (!m.ativo) return { icone: EyeOff, texto: "Ocultada do mural pela administração", cor: "text-red-600" };
  if (m.origem === "agradecimento_pap") return { icone: Globe, texto: "Público (agradecimentos aos PAPs)", cor: "text-green-700 dark:text-green-400" };
  if (!m.publico) return { icone: Lock, texto: "Só para você", cor: "text-neutral-500" };
  if (m.statusPeregrinacao === "planejada") return { icone: Globe, texto: "Vai para o mural ao iniciar a caminhada", cor: "text-amber-700" };
  return { icone: Globe, texto: "No mural de pedidos e agradecimentos", cor: "text-green-700 dark:text-green-400" };
}

function CartaoMensagem({
  m,
  onSalvo,
  onApagado,
}: {
  m: MensagemMinha;
  onSalvo: (m: MensagemMinha) => void;
  onApagado: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState(m.tipo);
  const [texto, setTexto] = useState(m.texto);
  const [publico, setPublico] = useState(m.publico);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const max = m.origem === "intencao" ? 280 : 220;
  const s = situacao(m);
  const Icone = s.icone;
  const data = new Date(m.quando).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  async function salvar() {
    setErro(null);
    const t = texto.trim();
    if (!t) {
      setErro("Escreva a mensagem (ou use Apagar).");
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    const { error } =
      m.origem === "intencao"
        ? await supabase
            .from("intencoes_peregrinacao")
            .update({ tipo, texto: t, publico, atualizado_em: new Date().toISOString() })
            .eq("id", m.id)
        : await supabase.from("agradecimentos_pap").update({ mensagem: t }).eq("id", m.id);
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar agora. Tente novamente.");
      return;
    }
    onSalvo({ ...m, tipo: m.origem === "intencao" ? tipo : m.tipo, texto: t, publico: m.origem === "intencao" ? publico : m.publico });
    setEditando(false);
  }

  async function apagar() {
    if (!confirm("Apagar esta mensagem? Não dá para desfazer.")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from(m.origem === "intencao" ? "intencoes_peregrinacao" : "agradecimentos_pap")
      .delete()
      .eq("id", m.id);
    if (error) {
      setErro("Não foi possível apagar agora. Tente novamente.");
      return;
    }
    onApagado(m.id);
  }

  return (
    <li className="card flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {m.origem === "agradecimento_pap" ? "Agradecimento ao PAP" : m.tipo === "pedido" ? "Pedido" : "Agradecimento"}
        </span>
        <span className="text-neutral-500">
          {m.contexto} · {data}
        </span>
      </div>
      {!editando ? (
        <>
          <p className="text-sm text-neutral-800 dark:text-neutral-100" style={{ textAlign: "left" }}>
            &ldquo;{m.texto}&rdquo;
          </p>
          <p className={`flex items-center gap-1 text-xs ${s.cor}`}>
            <Icone size={13} /> {s.texto}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditando(true)} className="btn-secondary flex items-center gap-1 text-sm">
              <Pencil size={14} /> Editar
            </button>
            <button
              type="button"
              onClick={apagar}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 size={14} /> Apagar
            </button>
          </div>
        </>
      ) : (
        <>
          {m.origem === "intencao" && (
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
                    tipo === v
                      ? "bg-amber-800 text-white"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <textarea className="input" rows={3} maxLength={max} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <p className="-mt-1 text-xs text-neutral-400" style={{ textAlign: "right" }}>
            {texto.length}/{max}
          </p>
          {m.origem === "intencao" && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
              <span style={{ textAlign: "left" }}>
                Mostrar no <strong>mural de pedidos e agradecimentos</strong>, com meu primeiro nome e cidade.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={salvar} disabled={salvando} className="btn-primary flex items-center gap-1">
              <Check size={16} /> {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setTipo(m.tipo);
                setTexto(m.texto);
                setPublico(m.publico);
                setErro(null);
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </li>
  );
}

// Rodada 74 — lista por ano, com edição e exclusão.
export default function MinhasMensagensClient({ inicial }: { inicial: MensagemMinha[] }) {
  const [lista, setLista] = useState(inicial);
  const porAno = useMemo(() => {
    const grupos: { ano: string; itens: MensagemMinha[] }[] = [];
    for (const m of lista) {
      const ano = m.ano || "Sem data";
      let g = grupos.find((x) => x.ano === ano);
      if (!g) {
        g = { ano, itens: [] };
        grupos.push(g);
      }
      g.itens.push(m);
    }
    return grupos;
  }, [lista]);

  if (lista.length === 0) {
    return (
      <p className="card text-sm text-neutral-500" style={{ textAlign: "left" }}>
        Você ainda não mandou nenhuma mensagem. O pedido ou agradecimento é escrito ao planejar a peregrinação, e o
        agradecimento aos PAPs, depois de concluir, na página do certificado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {porAno.map((g) => (
        <section key={g.ano} className="flex flex-col gap-3">
          <h2 className="border-b border-amber-200 pb-1 text-lg font-bold text-amber-800 dark:border-amber-900 dark:text-amber-500">
            {g.ano}
          </h2>
          <ul className="flex flex-col gap-3">
            {g.itens.map((m) => (
              <CartaoMensagem
                key={`${m.origem}-${m.id}`}
                m={m}
                onSalvo={(novo) => setLista((l) => l.map((x) => (x.id === novo.id && x.origem === novo.origem ? novo : x)))}
                onApagado={(id) => setLista((l) => l.filter((x) => !(x.id === id && x.origem === m.origem)))}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
