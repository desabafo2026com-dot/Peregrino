"use client";

import Link from "next/link";
import { useState } from "react";
import { intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Radio,
  Award,
  CalendarCheck,
  MapPinned,
  Sun,
  Clock,
  TriangleAlert,
} from "lucide-react";
import { MEIO_TRANSPORTE_LABELS, STATUS_PAP_LABELS, SENTIDO_PISTA_LABELS } from "@/lib/constants";

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

const ABAS_PEREGRINO = [
  { key: "cadastrados", label: "Cadastrados", icon: Users },
  { key: "ativos", label: "Ativos agora", icon: Radio },
  { key: "concluidos", label: "Concluídas", icon: Award },
  { key: "concluidosHoje", label: "Concluídas hoje", icon: CalendarCheck },
] as const;

const ABAS_PAP = [
  { key: "cadastrados", label: "Cadastrados", icon: MapPinned },
  { key: "ativos", label: "Ativos", icon: Sun },
  { key: "pendentes", label: "Pendentes", icon: Clock },
  { key: "riscos", label: "Locais de risco", icon: TriangleAlert },
] as const;

type AbaPeregrino = (typeof ABAS_PEREGRINO)[number]["key"];
type AbaPap = (typeof ABAS_PAP)[number]["key"];

export default function AdminDrilldownClient({
  peregrinos,
  pap,
  riscos,
}: {
  peregrinos: Record<AbaPeregrino, PeregrinoLinha[]>;
  pap: Record<Exclude<AbaPap, "riscos">, PapLinha[]>;
  riscos: RiscoLinha[];
}) {
  const [abaPeregrino, setAbaPeregrino] = useState<AbaPeregrino>("cadastrados");
  const [abaPap, setAbaPap] = useState<AbaPap>("cadastrados");

  const listaPeregrino = peregrinos[abaPeregrino];
  const listaPap = abaPap === "riscos" ? [] : pap[abaPap];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">Peregrinos</h2>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ABAS_PEREGRINO.map((a) => (
            <button
              key={a.key}
              onClick={() => setAbaPeregrino(a.key)}
              className={`card text-center transition ${
                abaPeregrino === a.key ? "border-amber-500 ring-1 ring-amber-500" : "hover:border-amber-300"
              }`}
            >
              <a.icon className="mx-auto mb-1 text-amber-700" size={20} />
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">
                {peregrinos[a.key].length}
              </p>
              <p className="text-xs text-neutral-500">{a.label}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {listaPeregrino.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
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
                  {" — "}
                  Tempo de peregrinação:{" "}
                  {p.status === "sem_peregrinacao" ? "-" : tempoDecorrido(p.dataInicio, p.dataFim)}
                  {" — "}
                  {p.checkinsCount} check-in(s)
                </p>
              </div>
            </div>
          ))}
          {listaPeregrino.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhum registro nesta categoria.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">PAP</h2>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ABAS_PAP.map((a) => (
            <button
              key={a.key}
              onClick={() => setAbaPap(a.key)}
              className={`card text-center transition ${
                abaPap === a.key ? "border-amber-500 ring-1 ring-amber-500" : "hover:border-amber-300"
              }`}
            >
              <a.icon className="mx-auto mb-1 text-amber-700" size={20} />
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">
                {a.key === "riscos" ? riscos.length : pap[a.key].length}
              </p>
              <p className="text-xs text-neutral-500">{a.label}</p>
            </button>
          ))}
        </div>
        {abaPap === "riscos" ? (
          <div className="flex flex-col gap-2">
            {riscos.map((r) => (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <TriangleAlert size={16} className="text-red-600" />
                    {r.titulo}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Tipo: {r.tipo} — Nível de risco: {r.nivelRisco}/5
                    {r.kmReferencia != null ? ` — km ${r.kmReferencia}` : ""}
                    {r.rotaNome ? ` — ${r.rotaNome}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {riscos.length === 0 && (
              <p className="text-sm text-neutral-400">Nenhum local de risco cadastrado ainda.</p>
            )}
            <Link href="/admin/riscos/novo" className="btn-secondary mt-1 w-fit text-sm">
              Cadastrar local de risco
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {listaPap.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
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
              </div>
            ))}
            {listaPap.length === 0 && (
              <p className="text-sm text-neutral-400">Nenhum registro nesta categoria.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
