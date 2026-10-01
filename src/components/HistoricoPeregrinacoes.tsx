"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Bike, Footprints, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import type { MeioTransporte } from "@/types/database";

// Rodada 56 — a lista de "Peregrinações concluídas" saiu de "Minha
// peregrinação" (a pedido do usuário, lá fica só a caminhada atual) e veio
// para "Meus certificados", com as mesmas ações de reabrir e excluir.
export interface PeregrinacaoHistorico {
  id: string;
  meioTransporte: MeioTransporte | null;
  meioTransporteOutroDesc: string | null;
  rotaNome: string | null;
  origem: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  temCertificado: boolean;
  certificadoId: string | null;
  plusPago: boolean;
}

function labelMeio(meio: MeioTransporte | null, outroDesc: string | null) {
  if (meio === "outros") return outroDesc || "outro meio de transporte";
  return meio ? (MEIO_TRANSPORTE_LABELS[meio] ?? "a pé") : "a pé";
}

// Ano da conclusão no horário de Brasília (para agrupar por ano).
function anoDe(p: PeregrinacaoHistorico) {
  const d = p.dataFim ?? p.dataInicio;
  if (!d) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(d));
}

export default function HistoricoPeregrinacoes({
  lista,
  temPeregrinacaoAtiva,
  porAno = false,
}: {
  lista: PeregrinacaoHistorico[];
  temPeregrinacaoAtiva: boolean;
  // Rodada 60 — em "Meus certificados" a lista vem separada por ano.
  porAno?: boolean;
}) {
  const router = useRouter();
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (lista.length === 0) return null;

  async function reabrir(id: string) {
    setErro(null);
    if (temPeregrinacaoAtiva) {
      setErro("Finalize ou exclua a peregrinação atual antes de reabrir uma peregrinação concluída anterior.");
      return;
    }
    if (
      !confirm(
        "Reabrir esta peregrinação? Ela voltará para 'em andamento' e o certificado emitido (se houver) deixa de ser válido."
      )
    )
      return;
    setOcupadoId(id);
    const { error } = await createClient()
      .from("peregrinacoes")
      .update({ status: "em_andamento", data_fim: null })
      .eq("id", id);
    setOcupadoId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    router.push("/peregrinacao");
  }

  async function excluir(id: string) {
    setErro(null);
    if (!confirm("Excluir esta peregrinação? Essa ação não pode ser desfeita e apaga também seus check-ins e certificado."))
      return;
    setOcupadoId(id);
    const { error } = await createClient().from("peregrinacoes").delete().eq("id", id);
    setOcupadoId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    router.refresh();
  }

  function cartao(p: PeregrinacaoHistorico) {
    return (
      <div key={p.id} className="card flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-500">
            {p.meioTransporte === "bicicleta" ? <Bike size={16} /> : <Footprints size={16} />}
            {p.origem ? `${p.origem} → Aparecida` : labelMeio(p.meioTransporte, p.meioTransporteOutroDesc)}
          </p>
          {p.certificadoId && (
            <a
              href={p.plusPago ? `/certificado/plus/${p.certificadoId}` : `/certificado/${p.certificadoId}#romaria-plus`}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-500"
            >
              <Sparkles size={12} />
              {p.plusPago ? "Minhas fotos da Romaria Plus →" : "Adquirir Certificado Plus + arte de 5 fotos →"}
            </a>
          )}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
          {p.dataInicio ? new Date(p.dataInicio).toLocaleDateString("pt-BR") : "-"}
          {" a "}
          {p.dataFim ? new Date(p.dataFim).toLocaleDateString("pt-BR") : "-"}
          {" — "}
          {labelMeio(p.meioTransporte, p.meioTransporteOutroDesc)}
          {p.rotaNome ? ` — ${p.rotaNome}` : ""}
          {!p.temCertificado && " — sem certificado"}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {p.certificadoId && (
            <a href={`/certificado/${p.certificadoId}`} className="btn-primary text-xs">
              Ver certificado
            </a>
          )}
          <button
            disabled={ocupadoId === p.id || temPeregrinacaoAtiva}
            onClick={() => reabrir(p.id)}
            title={temPeregrinacaoAtiva ? "Finalize ou exclua a peregrinação atual antes de reabrir esta" : undefined}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <RotateCcw size={14} /> Reabrir
          </button>
          <button
            disabled={ocupadoId === p.id}
            onClick={() => excluir(p.id)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>
    );
  }

  const grupos: { ano: string; itens: PeregrinacaoHistorico[] }[] = [];
  for (const p of lista) {
    const ano = porAno ? anoDe(p) : "";
    const g = grupos.find((x) => x.ano === ano);
    if (g) g.itens.push(p);
    else grupos.push({ ano, itens: [p] });
  }

  return (
    <section id="peregrinacoes-concluidas" className="scroll-mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
        <Award size={20} /> Peregrinações concluídas
      </h2>
      {erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40">{erro}</p>}
      <div className="flex flex-col gap-3">
        {grupos.map((g) =>
          porAno ? (
            <div key={g.ano} className="flex flex-col gap-3">
              <h3 className="mt-2 text-sm font-bold tracking-wide text-neutral-500 uppercase">{g.ano}</h3>
              {g.itens.map(cartao)}
            </div>
          ) : (
            g.itens.map(cartao)
          )
        )}
      </div>
    </section>
  );
}
