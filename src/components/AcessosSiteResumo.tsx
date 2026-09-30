import { Eye, Smartphone, UserX, Download } from "lucide-react";

// Rodada 50 — resumo dos acessos ao site (Migration 44), mostrado no topo
// do Painel e do Dashboard do administrador. Recebe o JSON pronto de
// estatisticas_acessos(); sem a migration (dados nulos), mostra só um aviso.

export interface EstatisticasAcessos {
  hoje: number;
  visitantes_hoje: number;
  ontem: number;
  visitantes_ontem: number;
  ultimos_7: number;
  visitantes_7: number;
  ultimos_30: number;
  visitantes_30: number;
  total: number;
  visitantes_total: number;
  sem_cadastro_7: number;
  app_instalado_7: number;
  por_dispositivo_7: Record<string, number>;
  por_dia: { dia: string; acessos: number; visitantes: number }[];
}

const NOMES_DISPOSITIVO: Record<string, string> = {
  android: "Android",
  ios: "iPhone",
  computador: "Computador",
  outro: "Outros",
};

function numero(n: number) {
  return n.toLocaleString("pt-BR");
}

function porcentagem(parte: number, todo: number) {
  if (!todo) return "0%";
  return `${Math.round((parte / todo) * 100)}%`;
}

function diaCurto(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default function AcessosSiteResumo({ dados }: { dados: EstatisticasAcessos | null }) {
  if (!dados) {
    return (
      <section className="card">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
          <Eye size={18} /> Acessos ao site
        </h2>
        <p className="text-sm text-neutral-500">
          O contador de acessos começa a funcionar depois de rodar a Migration 44 no Supabase.
        </p>
      </section>
    );
  }

  const maxDia = Math.max(1, ...dados.por_dia.map((d) => d.acessos));
  const blocos = [
    { rotulo: "Hoje", acessos: dados.hoje, visitantes: dados.visitantes_hoje },
    { rotulo: "Ontem", acessos: dados.ontem, visitantes: dados.visitantes_ontem },
    { rotulo: "7 dias", acessos: dados.ultimos_7, visitantes: dados.visitantes_7 },
    { rotulo: "30 dias", acessos: dados.ultimos_30, visitantes: dados.visitantes_30 },
    { rotulo: "Total", acessos: dados.total, visitantes: dados.visitantes_total },
  ];
  const dispositivos = Object.entries(dados.por_dispositivo_7 ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <section className="card">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
        <Eye size={18} /> Acessos ao site
      </h2>
      <p className="mb-3 text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Todas as pessoas que abriram o site ou o app, com ou sem cadastro. Acesso = cada vez que alguém abre;
        pessoas = aparelhos diferentes.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {blocos.map((b) => (
          <div
            key={b.rotulo}
            className="flex flex-col items-center rounded-xl border border-neutral-200 px-2 py-2 dark:border-neutral-800"
          >
            <span className="text-xs font-medium text-neutral-500">{b.rotulo}</span>
            <span className="text-2xl font-bold text-amber-800 tabular-nums dark:text-amber-500">{numero(b.acessos)}</span>
            <span className="text-xs text-neutral-500 tabular-nums">{numero(b.visitantes)} pessoas</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Acessos por dia (últimos 14 dias)</p>
        <div className="flex h-28 items-end gap-[3px]" role="img" aria-label="Acessos por dia nos últimos 14 dias">
          {dados.por_dia.map((d) => (
            <div key={d.dia} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <span className="pointer-events-none absolute -top-1 hidden -translate-y-full rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">
                {diaCurto(d.dia)}: {d.acessos} acessos, {d.visitantes} pessoas
              </span>
              <div
                className="w-full rounded-t bg-amber-600 dark:bg-amber-500"
                style={{ height: `${(d.acessos / maxDia) * 100}%`, minHeight: d.acessos > 0 ? 3 : 0 }}
                title={`${diaCurto(d.dia)}: ${d.acessos} acessos, ${d.visitantes} pessoas`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[3px] border-t border-neutral-200 pt-1 dark:border-neutral-800">
          {dados.por_dia.map((d, i) => (
            <span key={d.dia} className="flex-1 text-center text-[9px] text-neutral-400 tabular-nums">
              {i % 2 === 1 || i === dados.por_dia.length - 1 ? diaCurto(d.dia) : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
          <UserX size={16} className="shrink-0 text-neutral-500" />
          <span>
            <strong>{porcentagem(dados.sem_cadastro_7, dados.ultimos_7)}</strong> sem entrar na conta (7 dias)
          </span>
        </p>
        <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
          <Download size={16} className="shrink-0 text-neutral-500" />
          <span>
            <strong>{numero(dados.app_instalado_7)}</strong> pelo app instalado (7 dias)
          </span>
        </p>
        <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
          <Smartphone size={16} className="shrink-0 text-neutral-500" />
          <span>
            {dispositivos.length === 0
              ? "Sem acessos nos últimos 7 dias"
              : dispositivos.map(([k, n]) => `${NOMES_DISPOSITIVO[k] ?? k} ${porcentagem(n, dados.ultimos_7)}`).join(" · ")}
          </span>
        </p>
      </div>
    </section>
  );
}
