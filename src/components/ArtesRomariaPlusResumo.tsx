import { Gift, Image as ImageIcon, CreditCard, Download, Share2 } from "lucide-react";

// Rodada 75 — contador das artes (fotos) criadas na Romaria Plus, separando
// as grátis (arte grátis, cortesias e cupons: compra de valor zero) das
// pagas (compra paga com valor). Contas da equipe (admin/agente) ficam de
// fora, como nas outras métricas.
export interface ResumoArtes {
  gratis: { hoje: number; d7: number; total: number };
  pagas: { hoje: number; d7: number; total: number };
  downloads: number;
  compartilhamentos: number;
  comprasPagas: number;
  valorPagoCentavos: number;
  daEquipe: number;
}

function n(v: number) {
  return v.toLocaleString("pt-BR");
}

export default function ArtesRomariaPlusResumo({ dados }: { dados: ResumoArtes }) {
  const linhas = [
    { rotulo: "Grátis", Icone: Gift, cor: "text-green-700 dark:text-green-400", v: dados.gratis },
    { rotulo: "Pagas", Icone: CreditCard, cor: "text-amber-800 dark:text-amber-500", v: dados.pagas },
  ];
  return (
    <section className="card">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
        <ImageIcon size={18} /> Fotos/artes criadas (Romaria Plus)
      </h2>
      <p className="mb-3 text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Cada foto enviada para uma arte conta uma vez. Grátis = arte grátis, cortesias e cupons (sem pagamento). Pagas =
        da Romaria Plus paga ou de pacote extra pago.
        {dados.daEquipe > 0 ? ` ${n(dados.daEquipe)} da equipe (admin/agente) não entram.` : ""}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {linhas.map(({ rotulo, Icone, cor, v }) => (
          <div key={rotulo} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className={`flex items-center gap-1.5 text-sm font-bold ${cor}`}>
              <Icone size={16} /> {rotulo}
            </p>
            <p className={`text-3xl font-bold tabular-nums ${cor}`}>{n(v.total)}</p>
            <p className="text-xs text-neutral-500 tabular-nums">
              hoje {n(v.hoje)} · 7 dias {n(v.d7)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-1 text-sm text-neutral-700 sm:grid-cols-3 dark:text-neutral-200">
        <p className="flex items-center gap-1.5" style={{ textAlign: "left" }}>
          <CreditCard size={15} className="text-neutral-500" /> {n(dados.comprasPagas)} compra
          {dados.comprasPagas === 1 ? "" : "s"} paga{dados.comprasPagas === 1 ? "" : "s"} ·{" "}
          {(dados.valorPagoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <p className="flex items-center gap-1.5" style={{ textAlign: "left" }}>
          <Download size={15} className="text-neutral-500" /> {n(dados.downloads)} downloads
        </p>
        <p className="flex items-center gap-1.5" style={{ textAlign: "left" }}>
          <Share2 size={15} className="text-neutral-500" /> {n(dados.compartilhamentos)} compartilhamentos
        </p>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400" style={{ textAlign: "left" }}>
        Valor bruto pago pelos peregrinos, antes da taxa do Mercado Pago.
      </p>
    </section>
  );
}
