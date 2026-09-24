"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BarChart3,
  Users,
  Footprints,
  MapPin,
  TriangleAlert,
  Award,
  Clock,
  CalendarDays,
} from "lucide-react";
import { MOTIVOS, RELIGIOES, MEIO_TRANSPORTE_OPTIONS, SENTIDO_PISTA_LABELS } from "@/lib/constants";
import type { StatusPeregrinacao, StatusAprovacaoPap, StatusRiscoInformado, CategoriaSinistro } from "@/types/database";

// ---------------------------------------------------------------------------
// Tipos dos dados já achatados/enriquecidos que vêm do servidor (page.tsx) —
// evita reconsultar o Supabase a cada troca de filtro; os filtros abaixo
// (período, rota) são aplicados aqui no navegador em cima deste conjunto já
// carregado, que para o volume de dados do app é pequeno o bastante para
// isso ser instantâneo.
// ---------------------------------------------------------------------------
export interface PeregrinacaoAnalytics {
  id: string;
  userId: string;
  status: StatusPeregrinacao;
  rotaSlug: string | null;
  rotaNome: string | null;
  meioTransporte: string;
  cidadeOrigem: string | null;
  dataInicioPrevista: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  diasPrevistos: number | null;
  emGrupo: boolean;
  tamanhoGrupo: number | null;
  criadoEm: string;
  temCertificado: boolean;
  motivo: string | null;
  religiao: string | null;
  sexo: string | null;
  dataNascimento: string | null;
  jaFezTrajeto: boolean;
  temAcompanhamentoCarroApoio: boolean;
  cidadePerfil: string | null;
  ufPerfil: string | null;
}

export interface CheckinAnalytics {
  id: string;
  peregrinacaoId: string;
  criadoEm: string;
}

export interface PapAnalytics {
  id: string;
  cidade: string | null;
  sentidoPista: "sp" | "rj" | null;
  rotaSlug: string | null;
  statusAprovacao: StatusAprovacaoPap;
  ativo: boolean;
  criadoEm: string;
}

export interface RiscoCadastradoAnalytics {
  id: string;
  tipo: string;
  sentido: "sp" | "rj" | null;
  rotaSlug: string | null;
  nivelRisco: number;
  criadoEm: string;
}

export interface RiscoInformadoAnalytics {
  id: string;
  categoria: CategoriaSinistro;
  tipo: string;
  rotaSlug: string | null;
  nivelRisco: number;
  status: StatusRiscoInformado;
  criadoEm: string;
}

interface Props {
  peregrinacoes: PeregrinacaoAnalytics[];
  checkins: CheckinAnalytics[];
  paps: PapAnalytics[];
  riscosCadastrados: RiscoCadastradoAnalytics[];
  riscosInformados: RiscoInformadoAnalytics[];
  rotas: { slug: string; nome: string }[];
}

// ---------------------------------------------------------------------------
// Paleta (skill de dataviz): 8 matizes categóricas validadas (ordem fixa,
// nunca ciclada) + uma rampa sequencial de um matiz só (azul) para gráficos
// de "comparar magnitude" (rankings) — ver references/palette.md da skill.
// Passos diferentes para claro/escuro, trocados por useIsDark() abaixo.
// ---------------------------------------------------------------------------
const CATEGORICAL_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const SEQUENCIAL_LIGHT = "#2a78d6";
const SEQUENCIAL_DARK = "#3987e5";

const CHROME_LIGHT = { grid: "#e1e0d9", axis: "#c3c2b7", textSecondary: "#52514e", textMuted: "#898781", surface: "#fcfcfb" };
const CHROME_DARK = { grid: "#2c2c2a", axis: "#383835", textSecondary: "#c3c2b7", textMuted: "#898781", surface: "#1a1a19" };

function useIsDark(): boolean {
  // Mesmo padrão de leitura inicial preguiçosa do ThemeToggle.tsx (evita
  // chamar setState de forma síncrona dentro do efeito).
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    const raiz = document.documentElement;
    const observer = new MutationObserver(() => setDark(raiz.classList.contains("dark")));
    observer.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

const SEXO_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
  prefiro_nao_dizer: "Prefiro não dizer",
};

const MOTIVO_LABELS: Record<string, string> = Object.fromEntries(MOTIVOS.map((m) => [m.value, m.label]));
const RELIGIAO_LABELS: Record<string, string> = Object.fromEntries(RELIGIOES.map((r) => [r.value, r.label]));
const TRANSPORTE_LABELS: Record<string, string> = Object.fromEntries(
  MEIO_TRANSPORTE_OPTIONS.map((m) => [m.value, m.label])
);

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const FAIXAS_ETARIAS_ORDEM = ["até 17", "18–24", "25–34", "35–44", "45–54", "55–64", "65+", "não informado"];

function idadeAnos(dataNascimento: string): number {
  const nasc = new Date(dataNascimento + "T00:00:00");
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

function faixaEtaria(dataNascimento: string | null): string {
  if (!dataNascimento) return "não informado";
  const idade = idadeAnos(dataNascimento);
  if (idade < 18) return "até 17";
  if (idade < 25) return "18–24";
  if (idade < 35) return "25–34";
  if (idade < 45) return "35–44";
  if (idade < 55) return "45–54";
  if (idade < 65) return "55–64";
  return "65+";
}

type Periodo = "todos" | "7" | "30" | "90" | "ano";
const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: "todos", label: "Todo o período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "ano", label: "Este ano" },
];

function dataDeCorte(periodo: Periodo): Date | null {
  if (periodo === "todos") return null;
  const hoje = new Date();
  if (periodo === "ano") return new Date(hoje.getFullYear(), 0, 1);
  const dias = Number(periodo);
  const corte = new Date(hoje);
  corte.setDate(corte.getDate() - dias);
  return corte;
}

function contarPor<T>(itens: T[], chave: (item: T) => string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const item of itens) {
    const k = chave(item);
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return mapa;
}

// Vira um array {label, value} pronto para os gráficos, na ordem informada
// (ordem fixa de categorias) ou, sem ordem, do maior para o menor valor.
function paraSerie(
  mapa: Map<string, number>,
  labelDe: (chave: string) => string,
  ordemFixa?: string[]
): { label: string; value: number }[] {
  const chaves = ordemFixa ?? Array.from(mapa.keys()).sort((a, b) => (mapa.get(b) ?? 0) - (mapa.get(a) ?? 0));
  return chaves.filter((k) => (mapa.get(k) ?? 0) > 0).map((k) => ({ label: labelDe(k), value: mapa.get(k) ?? 0 }));
}

// ---------------------------------------------------------------------------
// Peças de UI reutilizadas pelos gráficos
// ---------------------------------------------------------------------------
function SecaoTitulo({ icon: Icon, titulo, descricao }: { icon: React.ElementType; titulo: string; descricao?: string }) {
  return (
    <div className="mb-4 flex items-start gap-2">
      <Icon className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-500" size={20} />
      <div>
        <h2 className="font-bold text-amber-800 dark:text-amber-500">{titulo}</h2>
        {descricao && <p className="text-xs text-neutral-500">{descricao}</p>}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 text-center">
      <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">{value}</p>
      <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
        {label}
      </p>
      {sub && (
        <p className="text-[11px] text-neutral-400" style={{ textAlign: "center" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// Meter: uma razão contra um limite (0-100%) — trilho num tom claro do
// mesmo matiz, preenchimento no matiz cheio (ver marks-and-anatomy.md).
function Meter({ label, percent, sub, dark }: { label: string; percent: number; sub?: string; dark: boolean }) {
  const cor = dark ? SEQUENCIAL_DARK : SEQUENCIAL_LIGHT;
  const trilho = dark ? "#184f95" : "#cde2fb";
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</p>
        <p className="text-xl font-bold text-amber-800 dark:text-amber-500">{p.toFixed(0)}%</p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: trilho }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: cor }} />
      </div>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

// Barra horizontal de ranking (magnitude, um matiz só) — usada para motivos,
// cidades, religião, faixa etária etc. `ordenar=false` preserva a ordem já
// vinda em `data` (categorias com ordem própria, como faixa etária).
function RankedBarChart({
  data,
  dark,
  height,
  valueSuffix = "",
}: {
  data: { label: string; value: number }[];
  dark: boolean;
  height?: number;
  valueSuffix?: string;
}) {
  const chrome = dark ? CHROME_DARK : CHROME_LIGHT;
  const cor = dark ? SEQUENCIAL_DARK : SEQUENCIAL_LIGHT;
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Sem dados no período selecionado.</p>;
  }
  const alturaCalculada = height ?? Math.max(120, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={alturaCalculada}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={chrome.grid} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: chrome.textMuted, fontSize: 11 }} stroke={chrome.axis} />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fill: chrome.textSecondary, fontSize: 12 }}
          stroke={chrome.axis}
        />
        <Tooltip
          contentStyle={{ backgroundColor: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: chrome.textSecondary }}
          formatter={(value) => [`${value}${valueSuffix}`, "Total"]}
        />
        <Bar dataKey="value" fill={cor} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Colunas verticais (eixo ordinal — hora do dia, dia da semana), mesmo
// matiz sequencial único.
function ColumnBarChart({ data, dark }: { data: { label: string; value: number }[]; dark: boolean }) {
  const chrome = dark ? CHROME_DARK : CHROME_LIGHT;
  const cor = dark ? SEQUENCIAL_DARK : SEQUENCIAL_LIGHT;
  if (data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-sm text-neutral-400">Sem dados no período selecionado.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" tick={{ fill: chrome.textMuted, fontSize: 11 }} stroke={chrome.axis} interval={0} />
        <YAxis allowDecimals={false} tick={{ fill: chrome.textMuted, fontSize: 11 }} stroke={chrome.axis} width={30} />
        <Tooltip
          contentStyle={{ backgroundColor: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: chrome.textSecondary }}
        />
        <Bar dataKey="value" fill={cor} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barra única, horizontal, empilhada por proporção — para comparações de
// identidade com poucas categorias (rota Norte/Sul, sentido da pista,
// meio de transporte). Feita em HTML simples (não precisa de SVG para uma
// única barra), com o espaçador de 2px entre segmentos pedido pela skill.
function StackedProportionBar({
  segments,
  dark,
}: {
  segments: { label: string; value: number }[];
  dark: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cores = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Sem dados no período selecionado.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-8 w-full gap-0.5 overflow-hidden rounded-lg">
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <div
              key={s.label}
              style={{ flexGrow: s.value, backgroundColor: cores[i % cores.length] }}
              title={`${s.label}: ${s.value} (${((s.value / total) * 100).toFixed(0)}%)`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: cores[i % cores.length] }}
              />
              {s.label} — <strong>{s.value}</strong> ({((s.value / total) * 100).toFixed(0)}%)
            </div>
          ))}
      </div>
    </div>
  );
}

// Linha do tempo (uma ou duas séries) — usada para peregrinações
// iniciadas/concluídas ao longo do período filtrado.
function TrendLineChart({
  data,
  series,
  dark,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; colorIndex: number }[];
  dark: boolean;
}) {
  const chrome = dark ? CHROME_DARK : CHROME_LIGHT;
  const cores = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Sem dados no período selecionado.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="data" tick={{ fill: chrome.textMuted, fontSize: 11 }} stroke={chrome.axis} />
        <YAxis allowDecimals={false} tick={{ fill: chrome.textMuted, fontSize: 11 }} stroke={chrome.axis} width={30} />
        <Tooltip
          contentStyle={{ backgroundColor: chrome.surface, border: `1px solid ${chrome.grid}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: chrome.textSecondary }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: chrome.textSecondary }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={cores[s.colorIndex % cores.length]}
            strokeWidth={2}
            dot={{ r: 3, fill: cores[s.colorIndex % cores.length], strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function AdminAnalyticsClient({
  peregrinacoes,
  checkins,
  paps,
  riscosCadastrados,
  riscosInformados,
  rotas,
}: Props) {
  const dark = useIsDark();
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [rotaFiltro, setRotaFiltro] = useState<string>("todas");

  const corte = useMemo(() => dataDeCorte(periodo), [periodo]);

  const rotaSlugPorPeregrinacaoId = useMemo(() => {
    const m = new Map<string, string | null>();
    peregrinacoes.forEach((p) => m.set(p.id, p.rotaSlug));
    return m;
  }, [peregrinacoes]);

  const dentroDoPeriodo = useCallback(
    (iso: string | null): boolean => {
      if (!iso) return corte === null;
      if (!corte) return true;
      return new Date(iso) >= corte;
    },
    [corte]
  );
  const bateRota = useCallback(
    (rotaSlug: string | null): boolean => rotaFiltro === "todas" || rotaSlug === rotaFiltro,
    [rotaFiltro]
  );

  // Peregrinações "ativas no filtro" — pela data de início real, ou pela
  // data de criação para quem ainda só planejou (sem data_inicio).
  const peregrinacoesFiltradas = useMemo(
    () =>
      peregrinacoes.filter((p) => dentroDoPeriodo(p.dataInicio ?? p.criadoEm) && bateRota(p.rotaSlug)),
    [peregrinacoes, dentroDoPeriodo, bateRota]
  );
  // Mesmo filtro de período, mas sem o filtro de rota — para o próprio
  // gráfico "por rota" (filtrar por rota E mostrar a distribuição por rota
  // ao mesmo tempo seria circular: sempre daria 100% numa só).
  const peregrinacoesFiltradasSemRota = useMemo(
    () => peregrinacoes.filter((p) => dentroDoPeriodo(p.dataInicio ?? p.criadoEm)),
    [peregrinacoes, dentroDoPeriodo]
  );

  const checkinsFiltrados = useMemo(
    () =>
      checkins.filter(
        (c) => dentroDoPeriodo(c.criadoEm) && bateRota(rotaSlugPorPeregrinacaoId.get(c.peregrinacaoId) ?? null)
      ),
    [checkins, dentroDoPeriodo, bateRota, rotaSlugPorPeregrinacaoId]
  );

  const papsFiltrados = useMemo(
    () => paps.filter((p) => dentroDoPeriodo(p.criadoEm) && bateRota(p.rotaSlug)),
    [paps, dentroDoPeriodo, bateRota]
  );
  const papsFiltradosSemRota = useMemo(() => paps.filter((p) => dentroDoPeriodo(p.criadoEm)), [paps, dentroDoPeriodo]);

  const riscosCadastradosFiltrados = useMemo(
    () => riscosCadastrados.filter((r) => dentroDoPeriodo(r.criadoEm) && bateRota(r.rotaSlug)),
    [riscosCadastrados, dentroDoPeriodo, bateRota]
  );
  const riscosInformadosFiltrados = useMemo(
    () => riscosInformados.filter((r) => dentroDoPeriodo(r.criadoEm) && bateRota(r.rotaSlug)),
    [riscosInformados, dentroDoPeriodo, bateRota]
  );

  // ---- KPIs -----------------------------------------------------------
  const totalIniciadas = peregrinacoesFiltradas.length;
  const concluidasComSucesso = peregrinacoesFiltradas.filter((p) => p.temCertificado).length;
  const concluidasSemSucesso = peregrinacoesFiltradas.filter(
    (p) => p.status === "concluida" && !p.temCertificado
  ).length;
  const taxaConclusao = totalIniciadas > 0 ? (concluidasComSucesso / totalIniciadas) * 100 : 0;

  // ---- Linha do tempo (por dia, ou por semana se o período for longo) -
  const serieTemporal = useMemo(() => {
    const usarSemana = periodo === "todos" || periodo === "90" || periodo === "ano";
    function bucket(iso: string): string {
      const d = new Date(iso);
      if (usarSemana) {
        const inicioSemana = new Date(d);
        inicioSemana.setDate(d.getDate() - d.getDay());
        return inicioSemana.toISOString().slice(0, 10);
      }
      return iso.slice(0, 10);
    }
    const iniciadasPorBucket = new Map<string, number>();
    const concluidasPorBucket = new Map<string, number>();
    peregrinacoesFiltradas.forEach((p) => {
      const iso = p.dataInicio ?? p.criadoEm;
      const b = bucket(iso);
      iniciadasPorBucket.set(b, (iniciadasPorBucket.get(b) ?? 0) + 1);
      if (p.temCertificado && p.dataFim) {
        const bf = bucket(p.dataFim);
        concluidasPorBucket.set(bf, (concluidasPorBucket.get(bf) ?? 0) + 1);
      }
    });
    const todosBuckets = Array.from(new Set([...iniciadasPorBucket.keys(), ...concluidasPorBucket.keys()])).sort();
    return todosBuckets.map((b) => ({
      data: new Date(b + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      iniciadas: iniciadasPorBucket.get(b) ?? 0,
      concluidas: concluidasPorBucket.get(b) ?? 0,
    }));
  }, [peregrinacoesFiltradas, periodo]);

  // ---- Por rota (sempre sem o filtro de rota aplicado) -----------------
  const porRota = useMemo(() => {
    const mapa = contarPor(peregrinacoesFiltradasSemRota, (p) => p.rotaSlug ?? "não definida");
    return rotas
      .map((r) => ({ label: r.nome, value: mapa.get(r.slug) ?? 0 }))
      .concat(
        mapa.has("não definida") ? [{ label: "Rota não definida", value: mapa.get("não definida") ?? 0 }] : []
      );
  }, [peregrinacoesFiltradasSemRota, rotas]);

  // ---- Meio de transporte ----------------------------------------------
  const porTransporte = useMemo(() => {
    const mapa = contarPor(peregrinacoesFiltradas, (p) => p.meioTransporte);
    return paraSerie(mapa, (k) => TRANSPORTE_LABELS[k] ?? k, MEIO_TRANSPORTE_OPTIONS.map((o) => o.value));
  }, [peregrinacoesFiltradas]);

  // ---- Motivo -------------------------------------------------------
  const porMotivo = useMemo(() => {
    const mapa = contarPor(
      peregrinacoesFiltradas.filter((p) => p.motivo),
      (p) => p.motivo as string
    );
    return paraSerie(mapa, (k) => MOTIVO_LABELS[k] ?? k);
  }, [peregrinacoesFiltradas]);

  // ---- Top cidades de origem --------------------------------------------
  const porCidadeOrigem = useMemo(() => {
    const mapa = contarPor(
      peregrinacoesFiltradas.filter((p) => p.cidadeOrigem),
      (p) => p.cidadeOrigem as string
    );
    const serie = paraSerie(mapa, (k) => k);
    return serie.slice(0, 10);
  }, [peregrinacoesFiltradas]);

  // ---- Dia da semana em que a peregrinação começou ---------------------
  const porDiaSemana = useMemo(() => {
    const mapa = new Map<number, number>();
    peregrinacoesFiltradas.forEach((p) => {
      const iso = p.dataInicio ?? p.criadoEm;
      const dia = new Date(iso).getDay();
      mapa.set(dia, (mapa.get(dia) ?? 0) + 1);
    });
    return DIAS_SEMANA.map((label, i) => ({ label: label.slice(0, 3), value: mapa.get(i) ?? 0 }));
  }, [peregrinacoesFiltradas]);

  // ---- Horário do dia com mais check-ins (movimentação) -----------------
  const porHoraDoDia = useMemo(() => {
    const mapa = new Map<number, number>();
    checkinsFiltrados.forEach((c) => {
      const hora = new Date(c.criadoEm).getHours();
      mapa.set(hora, (mapa.get(hora) ?? 0) + 1);
    });
    return Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: mapa.get(h) ?? 0 }));
  }, [checkinsFiltrados]);

  // ---- Sexo / faixa etária / religião ------------------------------------
  const porSexo = useMemo(() => {
    const mapa = contarPor(
      peregrinacoesFiltradas.filter((p) => p.sexo),
      (p) => p.sexo as string
    );
    return paraSerie(mapa, (k) => SEXO_LABELS[k] ?? k);
  }, [peregrinacoesFiltradas]);

  const porFaixaEtaria = useMemo(() => {
    const mapa = contarPor(peregrinacoesFiltradas, (p) => faixaEtaria(p.dataNascimento));
    return paraSerie(mapa, (k) => k, FAIXAS_ETARIAS_ORDEM);
  }, [peregrinacoesFiltradas]);

  const porReligiao = useMemo(() => {
    const mapa = contarPor(
      peregrinacoesFiltradas.filter((p) => p.religiao),
      (p) => p.religiao as string
    );
    return paraSerie(mapa, (k) => RELIGIAO_LABELS[k] ?? k);
  }, [peregrinacoesFiltradas]);

  // ---- Já fez trajeto / carro de apoio / em grupo (%) -------------------
  const pctJaFez = totalIniciadas > 0 ? (peregrinacoesFiltradas.filter((p) => p.jaFezTrajeto).length / totalIniciadas) * 100 : 0;
  const pctCarroApoio =
    totalIniciadas > 0 ? (peregrinacoesFiltradas.filter((p) => p.temAcompanhamentoCarroApoio).length / totalIniciadas) * 100 : 0;
  const pctEmGrupo = totalIniciadas > 0 ? (peregrinacoesFiltradas.filter((p) => p.emGrupo).length / totalIniciadas) * 100 : 0;

  // ---- PAPs ---------------------------------------------------------
  const totalPaps = papsFiltrados.length;
  const papsAtivos = papsFiltrados.filter((p) => p.ativo && p.statusAprovacao === "aprovado").length;
  const papsPendentes = papsFiltrados.filter((p) => p.statusAprovacao === "pendente").length;

  const papsPorSentido = useMemo(() => {
    const mapa = contarPor(papsFiltradosSemRota, (p) => p.sentidoPista ?? "não informado");
    return [
      { label: SENTIDO_PISTA_LABELS.sp, value: mapa.get("sp") ?? 0 },
      { label: SENTIDO_PISTA_LABELS.rj, value: mapa.get("rj") ?? 0 },
      ...(mapa.has("não informado") ? [{ label: "Não informado", value: mapa.get("não informado") ?? 0 }] : []),
    ];
  }, [papsFiltradosSemRota]);

  const papsPorCidade = useMemo(() => {
    const mapa = contarPor(
      papsFiltrados.filter((p) => p.cidade),
      (p) => p.cidade as string
    );
    return paraSerie(mapa, (k) => k).slice(0, 10);
  }, [papsFiltrados]);

  // ---- Riscos ---------------------------------------------------------
  const riscosPorSentido = useMemo(() => {
    const mapa = contarPor(riscosCadastradosFiltrados, (r) => r.sentido ?? "não informado");
    return [
      { label: SENTIDO_PISTA_LABELS.sp, value: mapa.get("sp") ?? 0 },
      { label: SENTIDO_PISTA_LABELS.rj, value: mapa.get("rj") ?? 0 },
      ...(mapa.has("não informado") ? [{ label: "Não informado", value: mapa.get("não informado") ?? 0 }] : []),
    ];
  }, [riscosCadastradosFiltrados]);

  const avisosPorCategoria = useMemo(() => {
    const mapa = contarPor(riscosInformadosFiltrados, (r) => r.categoria);
    return paraSerie(mapa, (k) =>
      k === "sinistro" ? "Sinistro" : k === "suspeita" ? "Suspeita" : k === "chuva" ? "Chuva" : "Outros"
    );
  }, [riscosInformadosFiltrados]);

  const avisosPorStatus = useMemo(() => {
    const mapa = contarPor(riscosInformadosFiltrados, (r) => r.status);
    return [
      { label: "Confirmados", value: mapa.get("aprovado") ?? 0 },
      { label: "Aguardando revisão", value: mapa.get("pendente") ?? 0 },
      { label: "Não aprovados", value: mapa.get("rejeitado") ?? 0 },
    ];
  }, [riscosInformadosFiltrados]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <BarChart3 className="text-amber-700 dark:text-amber-500" /> Dashboard de métricas
        </h1>
        <p className="text-sm text-neutral-500">
          Visão geral de peregrinos, peregrinações, PAPs e riscos — filtre por período e por rota.
        </p>
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Período</label>
          <select className="input" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
            {PERIODO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Rota</label>
          <select className="input" value={rotaFiltro} onChange={(e) => setRotaFiltro(e.target.value)}>
            <option value="todas">Todas as rotas</option>
            {rotas.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visão geral */}
      <section>
        <SecaoTitulo icon={CalendarDays} titulo="Visão geral" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="peregrinações no período" value={totalIniciadas} />
          <StatTile label="concluídas com sucesso" value={concluidasComSucesso} />
          <StatTile label="concluídas sem sucesso" value={concluidasSemSucesso} />
          <StatTile label="check-ins no período" value={checkinsFiltrados.length} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Meter
            label="Taxa de conclusão com sucesso"
            percent={taxaConclusao}
            sub={`${concluidasComSucesso} de ${totalIniciadas} peregrinações do período`}
            dark={dark}
          />
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Peregrinações por rota</p>
            <StackedProportionBar segments={porRota} dark={dark} />
          </div>
        </div>
      </section>

      {/* Quando */}
      <section>
        <SecaoTitulo
          icon={Clock}
          titulo="Quando"
          descricao="Ao longo do tempo, dia da semana e horário do dia com mais movimento."
        />
        <div className="card mb-3">
          <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Peregrinações iniciadas e concluídas com sucesso
          </p>
          <TrendLineChart
            data={serieTemporal}
            series={[
              { key: "iniciadas", label: "Iniciadas", colorIndex: 0 },
              { key: "concluidas", label: "Concluídas com sucesso", colorIndex: 2 },
            ]}
            dark={dark}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Dia da semana em que mais começam
            </p>
            <ColumnBarChart data={porDiaSemana} dark={dark} />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Horário do dia com mais check-ins (movimentação)
            </p>
            <ColumnBarChart data={porHoraDoDia} dark={dark} />
          </div>
        </div>
      </section>

      {/* Peregrinos */}
      <section>
        <SecaoTitulo icon={Users} titulo="Peregrinos" descricao="Perfil de quem caminha, motivos e de onde vêm." />
        <div className="mb-3 grid grid-cols-3 gap-3">
          <StatTile label="já fizeram o trajeto antes" value={`${pctJaFez.toFixed(0)}%`} />
          <StatTile label="terão carro de apoio" value={`${pctCarroApoio.toFixed(0)}%`} />
          <StatTile label="vão em grupo" value={`${pctEmGrupo.toFixed(0)}%`} />
        </div>
        <div className="mb-3 card">
          <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Meio de transporte</p>
          <StackedProportionBar segments={porTransporte} dark={dark} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Motivo da peregrinação</p>
            <RankedBarChart data={porMotivo} dark={dark} />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Cidades de origem mais frequentes
            </p>
            <RankedBarChart data={porCidadeOrigem} dark={dark} />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Faixa etária</p>
            <RankedBarChart data={porFaixaEtaria} dark={dark} height={220} />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Religião</p>
            <RankedBarChart data={porReligiao} dark={dark} height={140} />
          </div>
          <div className="card sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Sexo</p>
            <StackedProportionBar segments={porSexo} dark={dark} />
          </div>
        </div>
      </section>

      {/* PAP */}
      <section>
        <SecaoTitulo icon={MapPin} titulo="Pontos de Apoio (PAP)" descricao="Onde ficam e de que lado da rodovia." />
        <div className="mb-3 grid grid-cols-3 gap-3">
          <StatTile label="PAP cadastrados no período" value={totalPaps} />
          <StatTile label="PAP ativos agora" value={papsAtivos} />
          <StatTile label="aguardando aprovação" value={papsPendentes} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              PAP por sentido da pista
            </p>
            <StackedProportionBar segments={papsPorSentido} dark={dark} />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">Cidades com mais PAP</p>
            <RankedBarChart data={papsPorCidade} dark={dark} />
          </div>
        </div>
      </section>

      {/* Riscos e segurança */}
      <section>
        <SecaoTitulo
          icon={TriangleAlert}
          titulo="Riscos e segurança"
          descricao="Locais de risco cadastrados pela administração e avisos enviados pelos próprios peregrinos."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Locais de risco cadastrados, por sentido da pista
            </p>
            <StackedProportionBar segments={riscosPorSentido} dark={dark} />
          </div>
          <div className="card">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Avisos enviados por peregrinos, por categoria
            </p>
            <RankedBarChart data={avisosPorCategoria} dark={dark} height={140} />
          </div>
          <div className="card sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Situação dos avisos enviados por peregrinos
            </p>
            <StackedProportionBar segments={avisosPorStatus} dark={dark} />
          </div>
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-neutral-400">
        <Footprints size={13} /> <Award size={13} className="ml-2" /> Dados calculados a partir do que já está
        registrado no app — sem nenhuma informação nova sendo coletada dos peregrinos para este painel.
      </p>
    </div>
  );
}
