"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarRange, Eraser } from "lucide-react";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA_ABREV = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatarBR(iso: string) {
  const d = fromISODate(iso);
  return d.toLocaleDateString("pt-BR");
}

interface Props {
  value: string[];
  onChange: (datas: string[]) => void;
}

export default function CalendarioDatas({ value, onChange }: Props) {
  const hoje = useMemo(() => new Date(), []);
  const [mesVisivel, setMesVisivel] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [modoPeriodo, setModoPeriodo] = useState(false);
  const [inicioPeriodo, setInicioPeriodo] = useState<string | null>(null);

  const anoAtual = hoje.getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 1 + i);

  const selecionadas = useMemo(() => new Set(value), [value]);

  const celulas = useMemo(() => {
    const ano = mesVisivel.getFullYear();
    const mes = mesVisivel.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    // getDay(): 0=domingo..6=sábado — convertendo para semana começando na segunda.
    const offset = (primeiroDia.getDay() + 6) % 7;
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const dias: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) dias.push(null);
    for (let d = 1; d <= diasNoMes; d++) dias.push(new Date(ano, mes, d));
    while (dias.length % 7 !== 0) dias.push(null);
    return dias;
  }, [mesVisivel]);

  function alternarData(iso: string) {
    if (modoPeriodo) {
      if (!inicioPeriodo) {
        setInicioPeriodo(iso);
        return;
      }
      const a = fromISODate(inicioPeriodo);
      const b = fromISODate(iso);
      const [inicio, fim] = a <= b ? [a, b] : [b, a];
      const novas = new Set(value);
      const cursor = new Date(inicio);
      while (cursor <= fim) {
        novas.add(toISODate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      onChange(Array.from(novas).sort());
      setInicioPeriodo(null);
      setModoPeriodo(false);
      return;
    }
    if (selecionadas.has(iso)) {
      onChange(value.filter((v) => v !== iso));
    } else {
      onChange([...value, iso].sort());
    }
  }

  function limpar() {
    onChange([]);
    setInicioPeriodo(null);
    setModoPeriodo(false);
  }

  function resumo() {
    if (value.length === 0) {
      return "Nenhuma data marcada — sem restrição, o PAP aparece sempre como ativo.";
    }
    const ordenadas = [...value].sort();
    // Detecta se as datas formam um período contínuo (dias consecutivos).
    const contiguo = ordenadas.every((iso, i) => {
      if (i === 0) return true;
      const anterior = fromISODate(ordenadas[i - 1]);
      anterior.setDate(anterior.getDate() + 1);
      return toISODate(anterior) === iso;
    });
    if (contiguo && ordenadas.length > 1) {
      return `Período: ${formatarBR(ordenadas[0])} a ${formatarBR(ordenadas[ordenadas.length - 1])} (${ordenadas.length} dias)`;
    }
    if (ordenadas.length <= 4) {
      return `Datas marcadas: ${ordenadas.map(formatarBR).join(", ")}`;
    }
    return `Datas marcadas: ${ordenadas.slice(0, 3).map(formatarBR).join(", ")} e mais ${ordenadas.length - 3}`;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMesVisivel((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-500">
          <span>{MESES[mesVisivel.getMonth()]}</span>
          <select
            className="rounded-lg border border-neutral-200 bg-transparent px-1.5 py-0.5 text-sm dark:border-neutral-800"
            value={mesVisivel.getFullYear()}
            onChange={(e) =>
              setMesVisivel((m) => new Date(Number(e.target.value), m.getMonth(), 1))
            }
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setMesVisivel((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400">
        {DIAS_SEMANA_ABREV.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((d, i) => {
          if (!d) return <span key={i} />;
          const iso = toISODate(d);
          const sel = selecionadas.has(iso);
          const ancora = inicioPeriodo === iso;
          const ehHoje = toISODate(hoje) === iso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => alternarData(iso)}
              className={`aspect-square rounded-lg text-xs font-medium transition ${
                sel
                  ? "bg-amber-800 text-white"
                  : ancora
                    ? "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
                    : ehHoje
                      ? "border border-amber-400 text-amber-800 dark:text-amber-400"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setModoPeriodo((v) => !v);
            setInicioPeriodo(null);
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
            modoPeriodo
              ? "border-amber-700 bg-amber-800 text-white"
              : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
          }`}
        >
          <CalendarRange size={14} />
          {modoPeriodo
            ? inicioPeriodo
              ? "Toque no último dia do período"
              : "Toque no primeiro dia do período"
            : "Marcar período"}
        </button>
        {value.length > 0 && (
          <button
            type="button"
            onClick={limpar}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Eraser size={14} /> Limpar
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-neutral-500">{resumo()}</p>
    </div>
  );
}
