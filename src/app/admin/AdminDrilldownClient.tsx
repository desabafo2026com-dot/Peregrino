"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Radio,
  Flag as FlagIcon,
  CalendarPlus,
  Award,
  CalendarCheck,
  MapPinned,
  Sun,
  Clock,
  TriangleAlert,
  Megaphone,
  Search,
  X,
  Check,
  Ban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEIO_TRANSPORTE_LABELS,
  STATUS_PAP_LABELS,
  SENTIDO_PISTA_LABELS,
  STATUS_RISCO_INFORMADO_LABELS,
} from "@/lib/constants";
import type { StatusRiscoInformado } from "@/types/database";

export interface PeregrinoLinha {
  id: string;
  nome: string;
  status: "em_andamento" | "concluida" | "sem_peregrinacao";
  local: string;
  meioTransporte: string | null;
  meioTransporteOutroDesc?: string | null;
  rotaNome: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  checkinsCount: number;
}

export interface PeregrinacaoLinha {
  id: string;
  nome: string;
  local: string;
  rotaNome: string | null;
  meioTransporte: string | null;
  meioTransporteOutroDesc?: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  checkinsCount: number;
  temCertificado: boolean;
}

export interface PapLinha {
  id: string;
  nome: string;
  cidade: string | null;
  kmReferencia: number | null;
  sentidoPista: string | null;
  statusAprovacao: string;
  abertoAgora: boolean;
  gerenteNome: string | null;
  criadoEm: string;
}

export interface RiscoLinha {
  id: string;
  titulo: string;
  tipo: string;
  nivelRisco: number;
  kmReferencia: number | null;
  rotaNome: string | null;
}

export interface RiscoInformadoLinha {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  nivelRisco: number;
  latitude: number;
  longitude: number;
  kmReferencia: number | null;
  rotaId: string | null;
  rotaNome: string | null;
  nomeInformante: string;
  status: StatusRiscoInformado;
  criadoEm: string;
}

function tempoDecorrido(inicio: string | null, fim: string | null) {
  if (!inicio) return "-";
  const fimData = fim ? new Date(fim) : new Date();
  const duracao = intervalToDuration({ start: new Date(inicio), end: fimData });
  const texto = formatDuration(duracao, { format: ["days", "hours", "minutes"], locale: ptBR, zero: false });
  return texto || "menos de 1 minuto";
}

function meioLabel(meio: string | null, outroDesc?: string | null) {
  if (!meio) return "-";
  if (meio === "outros") return outroDesc || "outros";
  return MEIO_TRANSPORTE_LABELS[meio] ?? meio;
}

const PAGE_SIZE = 50;

type Categoria =
  | { tipo: "peregrino"; titulo: string; dados: PeregrinoLinha[] }
  | { tipo: "peregrinacao"; titulo: string; dados: PeregrinacaoLinha[] }
  | { tipo: "pap"; titulo: string; dados: PapLinha[] }
  | { tipo: "risco"; titulo: string; dados: RiscoLinha[] }
  | { tipo: "riscoInformado"; titulo: string; dados: RiscoInformadoLinha[] };

interface Props {
  peregrinosCadastrados: PeregrinoLinha[];
  peregrinosAtivos: PeregrinoLinha[];
  peregrinacoesIniciadasHoje: PeregrinacaoLinha[];
  peregrinacoesConcluidasHoje: PeregrinacaoLinha[];
  peregrinacoesConcluidasTotal: PeregrinacaoLinha[];
  papCadastrados: PapLinha[];
  papAtivos: PapLinha[];
  papPendentes: PapLinha[];
  riscosCadastrados: RiscoLinha[];
  riscosInformados: RiscoInformadoLinha[];
}

function Card({
  icon: Icon,
  label,
  value,
  onClick,
  destaque,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  onClick: () => void;
  destaque?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`card text-center transition hover:border-amber-300 ${
        destaque ? "border-amber-400" : ""
      }`}
    >
      <Icon className="mx-auto mb-1 text-amber-700" size={20} />
      <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </button>
  );
}

export default function AdminDrilldownClient({
  peregrinosCadastrados,
  peregrinosAtivos,
  peregrinacoesIniciadasHoje,
  peregrinacoesConcluidasHoje,
  peregrinacoesConcluidasTotal,
  papCadastrados,
  papAtivos,
  papPendentes,
  riscosCadastrados,
  riscosInformados: riscosInformadosIniciais,
}: Props) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [riscosInformados, setRiscosInformados] = useState(riscosInformadosIniciais);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const pendentesCount = riscosInformados.filter((r) => r.status === "pendente").length;

  function abrir(cat: Categoria) {
    setCategoria(cat);
    setBusca("");
    setPagina(1);
  }

  function fechar() {
    setCategoria(null);
  }

  const dadosFiltrados = useMemo(() => {
    if (!categoria) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return categoria.dados;
    return (categoria.dados as unknown as Array<Record<string, unknown>>).filter((d) => {
      const nome = (d.nome as string) ?? (d.titulo as string) ?? "";
      const local = (d.local as string) ?? (d.cidade as string) ?? "";
      return nome.toLowerCase().includes(termo) || local.toLowerCase().includes(termo);
    });
  }, [categoria, busca]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const dadosPagina = dadosFiltrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  async function aprovarRisco(r: RiscoInformadoLinha) {
    setProcessandoId(r.id);
    const supabase = createClient();
    const { data: novoPonto, error: erroInsert } = await supabase
      .from("pontos_risco")
      .insert({
        titulo: r.titulo,
        descricao: r.descricao,
        latitude: r.latitude,
        longitude: r.longitude,
        km_referencia: r.kmReferencia,
        tipo: r.tipo,
        nivel_risco: r.nivelRisco,
        rota_id: r.rotaId,
      })
      .select()
      .single();
    if (!erroInsert && novoPonto) {
      await supabase
        .from("riscos_informados")
        .update({ status: "aprovado", ponto_risco_id: novoPonto.id })
        .eq("id", r.id);
      setRiscosInformados((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: "aprovado" as const } : x))
      );
    }
    setProcessandoId(null);
    router.refresh();
  }

  async function rejeitarRisco(id: string) {
    setProcessandoId(id);
    const supabase = createClient();
    await supabase.from("riscos_informados").update({ status: "rejeitado" }).eq("id", id);
    setRiscosInformados((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "rejeitado" as const } : x))
    );
    setProcessandoId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Peregrinos</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card
            icon={Users}
            label="Cadastrados"
            value={peregrinosCadastrados.length}
            onClick={() => abrir({ tipo: "peregrino", titulo: "Peregrinos cadastrados", dados: peregrinosCadastrados })}
          />
          <Card
            icon={Radio}
            label="Ativos"
            value={peregrinosAtivos.length}
            onClick={() => abrir({ tipo: "peregrino", titulo: "Peregrinos ativos agora", dados: peregrinosAtivos })}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Peregrinações</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Card
            icon={CalendarPlus}
            label="Iniciadas hoje"
            value={peregrinacoesIniciadasHoje.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações iniciadas hoje", dados: peregrinacoesIniciadasHoje })
            }
          />
          <Card
            icon={CalendarCheck}
            label="Concluídas hoje"
            value={peregrinacoesConcluidasHoje.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações concluídas hoje", dados: peregrinacoesConcluidasHoje })
            }
          />
          <Card
            icon={Award}
            label="Concluídas total"
            value={peregrinacoesConcluidasTotal.length}
            onClick={() =>
              abrir({ tipo: "peregrinacao", titulo: "Peregrinações concluídas (total)", dados: peregrinacoesConcluidasTotal })
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">PAP</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card
            icon={MapPinned}
            label="Cadastrados"
            value={papCadastrados.length}
            onClick={() => abrir({ tipo: "pap", titulo: "PAP cadastrados", dados: papCadastrados })}
          />
          <Card
            icon={Sun}
            label="Ativos"
            value={papAtivos.length}
            onClick={() => abrir({ tipo: "pap", titulo: "PAP ativos agora", dados: papAtivos })}
          />
          <Card
            icon={Clock}
            label="Pendentes"
            value={papPendentes.length}
            onClick={() => abrir({ tipo: "pap", titulo: "PAP pendentes de aprovação", dados: papPendentes })}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Riscos</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card
            icon={FlagIcon}
            label="Cadastrados"
            value={riscosCadastrados.length}
            onClick={() => abrir({ tipo: "risco", titulo: "Locais de risco cadastrados", dados: riscosCadastrados })}
          />
          <Card
            icon={Megaphone}
            label="Informados"
            value={pendentesCount}
            destaque={pendentesCount > 0}
            onClick={() =>
              abrir({ tipo: "riscoInformado", titulo: "Riscos informados por peregrinos", dados: riscosInformados })
            }
          />
        </div>
        <Link href="/admin/riscos/novo" className="btn-secondary mt-3 inline-block w-fit text-sm">
          Cadastrar local de risco
        </Link>
      </section>

      {categoria && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="font-bold text-amber-800 dark:text-amber-500">{categoria.titulo}</h3>
              <button onClick={fechar} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  autoFocus
                  className="input pl-9"
                  placeholder="Buscar por nome ou local..."
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {categoria.tipo === "peregrino" &&
                  (dadosPagina as PeregrinoLinha[]).map((p) => (
                    <div key={p.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        {p.status === "em_andamento" && <Radio size={16} className="text-green-600" />}
                        {p.status === "concluida" && <Award size={16} className="text-amber-700" />}
                        {p.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Local: {p.local}
                        {p.rotaNome ? ` — ${p.rotaNome}` : ""}
                        {p.meioTransporte ? ` — ${meioLabel(p.meioTransporte, p.meioTransporteOutroDesc)}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Início: {p.dataInicio ? new Date(p.dataInicio).toLocaleString("pt-BR") : "-"}
                        {" — "}Tempo: {p.status === "sem_peregrinacao" ? "-" : tempoDecorrido(p.dataInicio, p.dataFim)}
                        {" — "}
                        {p.checkinsCount} check-in(s)
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "peregrinacao" &&
                  (dadosPagina as PeregrinacaoLinha[]).map((p) => (
                    <div key={p.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        {p.temCertificado && <Award size={16} className="text-amber-700" />}
                        {p.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Local: {p.local}
                        {p.rotaNome ? ` — ${p.rotaNome}` : ""}
                        {p.meioTransporte ? ` — ${meioLabel(p.meioTransporte, p.meioTransporteOutroDesc)}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Início: {p.dataInicio ? new Date(p.dataInicio).toLocaleString("pt-BR") : "-"}
                        {" — "}Fim: {p.dataFim ? new Date(p.dataFim).toLocaleString("pt-BR") : "-"}
                        {" — "}
                        {p.checkinsCount} check-in(s)
                        {p.temCertificado ? " — com certificado" : ""}
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "pap" &&
                  (dadosPagina as PapLinha[]).map((p) => (
                    <div key={p.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        <MapPinned size={16} className="text-amber-700" />
                        {p.nome}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {p.cidade ?? "cidade não informada"}
                        {p.sentidoPista ? ` — ${SENTIDO_PISTA_LABELS[p.sentidoPista] ?? p.sentidoPista}` : ""}
                        {p.kmReferencia != null ? ` — km ${p.kmReferencia}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {p.gerenteNome ? `Gerente: ${p.gerenteNome}` : "Cadastrado pela administração"}
                        {" — "}
                        {STATUS_PAP_LABELS[p.statusAprovacao] ?? p.statusAprovacao}
                        {" — "}
                        {p.abertoAgora ? "aberto agora" : "fechado agora"}
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "risco" &&
                  (dadosPagina as RiscoLinha[]).map((r) => (
                    <div key={r.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        <TriangleAlert size={16} className={r.nivelRisco >= 4 ? "text-red-600" : "text-yellow-500"} />
                        {r.titulo}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Tipo: {r.tipo} — Nível de risco: {r.nivelRisco}/5
                        {r.kmReferencia != null ? ` — km ${r.kmReferencia}` : ""}
                        {r.rotaNome ? ` — ${r.rotaNome}` : ""}
                      </p>
                    </div>
                  ))}

                {categoria.tipo === "riscoInformado" &&
                  (dadosPagina as RiscoInformadoLinha[]).map((r) => (
                    <div key={r.id} className="card">
                      <p className="flex items-center gap-2 font-semibold">
                        <Megaphone size={16} className="text-amber-700" />
                        {r.titulo}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Informado por {r.nomeInformante} — {new Date(r.criadoEm).toLocaleString("pt-BR")}
                        {r.rotaNome ? ` — ${r.rotaNome}` : ""}
                        {r.kmReferencia != null ? ` — km ${r.kmReferencia}` : ""}
                      </p>
                      {r.descricao && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{r.descricao}</p>}
                      <p className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-neutral-500">
                          {STATUS_RISCO_INFORMADO_LABELS[r.status] ?? r.status}
                        </span>
                        {r.status === "pendente" && (
                          <span className="flex gap-2">
                            <button
                              disabled={processandoId === r.id}
                              onClick={() => aprovarRisco(r)}
                              className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300"
                            >
                              <Check size={14} /> Aprovar
                            </button>
                            <button
                              disabled={processandoId === r.id}
                              onClick={() => rejeitarRisco(r.id)}
                              className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                            >
                              <Ban size={14} /> Rejeitar
                            </button>
                          </span>
                        )}
                      </p>
                    </div>
                  ))}

                {dadosPagina.length === 0 && (
                  <p className="text-sm text-neutral-400">Nenhum registro encontrado.</p>
                )}
              </div>
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <button
                  disabled={paginaAtual <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="btn-secondary disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-neutral-500">
                  Página {paginaAtual} de {totalPaginas} — {dadosFiltrados.length} registro(s)
                </span>
                <button
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  className="btn-secondary disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
