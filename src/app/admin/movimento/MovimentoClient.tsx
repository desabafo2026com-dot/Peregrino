"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Pause, Play, RefreshCw, Users, UserRound, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { ehPeregrinacaoTeste } from "@/lib/constants";
import {
  MotorMovimento,
  MINUTOS_PASSO,
  PASSOS_DIA,
  SEM_CIDADE,
  hojeEmBrasilia,
  horarioDoPasso,
  inicioDoDia,
  normalizar,
  type DadosMovimento,
} from "@/lib/movimento-cidades";

const MovimentoMapa = dynamic(() => import("./MovimentoMapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[55vh] min-h-[320px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

const COR = {
  real: { claro: "#2a78d6", escuro: "#3987e5" },
  simulado: { claro: "#eb6834", escuro: "#d95926" },
};
const CHROME_LIGHT = { grid: "#e1e0d9", axis: "#c3c2b7", text: "#52514e", surface: "#fcfcfb" };
const CHROME_DARK = { grid: "#2c2c2a", axis: "#383835", text: "#c3c2b7", surface: "#1a1a19" };
const PASSO_MS = MINUTOS_PASSO * 60 * 1000;

function useIsDark(): boolean {
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

function maxPassoDoDia(dia: string): number {
  if (dia !== hojeEmBrasilia()) return PASSOS_DIA - 1;
  const decorrido = Date.now() - inicioDoDia(dia).getTime();
  return Math.max(0, Math.min(PASSOS_DIA - 1, Math.floor(decorrido / PASSO_MS)));
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function MovimentoClient() {
  const dark = useIsDark();
  const hoje = hojeEmBrasilia();
  const [dia, setDia] = useState(hoje);
  const [dados, setDados] = useState<DadosMovimento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [passo, setPasso] = useState(() => maxPassoDoDia(hoje));
  const [modo, setModo] = useState<"real" | "simulado">("simulado");
  const [tocando, setTocando] = useState(false);
  const [incluirTestes, setIncluirTestes] = useState(false);
  const [consulta, setConsulta] = useState(0);

  const ehHoje = dia === hoje;
  const maxPasso = useMemo(() => maxPassoDoDia(dia), [dia, dados]); // eslint-disable-line react-hooks/exhaustive-deps

  const motor = useMemo(() => {
    if (!dados) return null;
    const peregs = incluirTestes
      ? dados.peregrinacoes
      : dados.peregrinacoes.filter(
          (p) =>
            !ehPeregrinacaoTeste(p, { motivo: p.perfil_motivo, motivo_outro_desc: p.perfil_motivo_outro_desc })
        );
    return new MotorMovimento(peregs, dados.eventos, dados.romarias);
  }, [dados, incluirTestes]);

  const instante = useCallback(
    (p: number) => {
      const t = inicioDoDia(dia).getTime() + p * PASSO_MS;
      return ehHoje && p >= maxPasso ? Date.now() : t;
    },
    [dia, ehHoje, maxPasso]
  );

  const serie = useMemo(() => {
    if (!motor) return [];
    const pontos: { passo: number; horario: string; real: number; simulado: number }[] = [];
    for (let p = 0; p <= maxPasso; p++) {
      const r = motor.momento(instante(p));
      pontos.push({ passo: p, horario: horarioDoPasso(p), real: r.totalReal, simulado: r.totalSimulado });
    }
    return pontos;
  }, [motor, maxPasso, instante]);

  useEffect(() => {
    let cancelado = false;
    createClient()
      .rpc("admin_movimento_cidades", { p_dia: dia })
      .then(({ data, error }) => {
        if (cancelado) return;
        setCarregando(false);
        if (error) {
          setErro(
            /admin_movimento_cidades/.test(error.message)
              ? "A função do banco ainda não existe: rode a Migration 66 no Supabase."
              : error.message
          );
          setDados(null);
          return;
        }
        setErro(null);
        const d = data as DadosMovimento;
        setDados(d);
        if (dia === hojeEmBrasilia()) {
          setPasso(maxPassoDoDia(dia));
        } else {
          // Dia passado: abre no horário de pico da estimativa.
          const motorDia = new MotorMovimento(
            d.peregrinacoes.filter(
              (p) => !ehPeregrinacaoTeste(p, { motivo: p.perfil_motivo, motivo_outro_desc: p.perfil_motivo_outro_desc })
            ),
            d.eventos,
            d.romarias
          );
          let melhor = 48;
          let maior = -1;
          for (let p = 0; p < PASSOS_DIA; p++) {
            const r = motorDia.momento(inicioDoDia(dia).getTime() + p * PASSO_MS);
            if (r.totalSimulado > maior) {
              maior = r.totalSimulado;
              melhor = p;
            }
          }
          setPasso(maior > 0 ? melhor : 48);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [dia, consulta]);

  const passoVisivel = Math.min(passo, maxPasso);
  const animando = tocando && passoVisivel < maxPasso;

  // Animação da régua
  useEffect(() => {
    if (!animando) return;
    const id = window.setInterval(() => setPasso((p) => Math.min(maxPasso, p + 1)), 600);
    return () => window.clearInterval(id);
  }, [animando, maxPasso]);
  const resultado = useMemo(() => (motor ? motor.momento(instante(passoVisivel)) : null), [motor, instante, passoVisivel]);

  const maximoMapa = useMemo(() => {
    let m = 1;
    for (const c of resultado?.cidades ?? []) m = Math.max(m, modo === "real" ? c.real : c.simulado);
    return m;
  }, [resultado, modo]);

  const pico = useMemo(() => {
    let melhor: (typeof serie)[number] | null = null;
    for (const s of serie) if (!melhor || s[modo] > melhor[modo]) melhor = s;
    return melhor;
  }, [serie, modo]);

  // Romarias cadastradas em execução que não têm ninguém com o app no dia.
  const romariasSemApp = useMemo(() => {
    if (!dados || !motor) return [];
    const ligadas = new Set(motor.grupos.filter((g) => g.romaria).map((g) => normalizar(g.romaria!.nome)));
    return dados.romarias.filter((r) => !ligadas.has(normalizar(r.nome)));
  }, [dados, motor]);

  const chrome = dark ? CHROME_DARK : CHROME_LIGHT;
  const corReal = dark ? COR.real.escuro : COR.real.claro;
  const corSim = dark ? COR.simulado.escuro : COR.simulado.claro;
  const corModo = modo === "real" ? corReal : corSim;
  const rotuloHorario = ehHoje && passoVisivel >= maxPasso ? `agora (${horarioDoPasso(passoVisivel)})` : horarioDoPasso(passoVisivel);

  const trocarDia = (novo: string) => {
    if (!novo || novo > hoje || novo === dia) return;
    setTocando(false);
    setCarregando(true);
    setDia(novo);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <div className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="mov-dia">
              Dia
            </label>
            <input
              id="mov-dia"
              type="date"
              className="input"
              value={dia}
              max={hoje}
              onChange={(e) => trocarDia(e.target.value)}
            />
          </div>
          {!ehHoje && (
            <button type="button" className="btn-secondary" onClick={() => trocarDia(hoje)}>
              Hoje
            </button>
          )}
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={() => {
              setCarregando(true);
              setConsulta((c) => c + 1);
            }}
            disabled={carregando}
          >
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} /> Atualizar
          </button>
          <div role="tablist" aria-label="Tela" className="flex w-full sm:ml-auto sm:w-auto overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-700">
            {(
              [
                ["real", "Real", UserRound],
                ["simulado", "Simulada", Users],
              ] as const
            ).map(([valor, rotulo, Icone]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={modo === valor}
                onClick={() => setModo(valor)}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition ${
                  modo === valor
                    ? "text-white"
                    : "bg-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
                style={modo === valor ? { backgroundColor: valor === "real" ? corReal : corSim } : undefined}
              >
                <Icone size={16} /> {rotulo}
              </button>
            ))}
          </div>
        </div>

        {/* Régua */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <button
              type="button"
              aria-label={animando ? "Pausar" : "Animar o dia"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
              style={{ backgroundColor: corModo }}
              disabled={!dados || maxPasso === 0}
              onClick={() => {
                if (animando) {
                  setTocando(false);
                  return;
                }
                if (passoVisivel >= maxPasso) setPasso(0);
                setTocando(true);
              }}
            >
              {animando ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
              <input
                type="range"
                min={0}
                max={PASSOS_DIA - 1}
                step={1}
                value={passoVisivel}
                aria-label="Horário"
                aria-valuetext={rotuloHorario}
                onChange={(e) => {
                  setTocando(false);
                  setPasso(Math.min(maxPasso, Number(e.target.value)));
                }}
                className="w-full"
                style={{ accentColor: corModo }}
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                {["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h", "24h"].map((h, i) => (
                  <span key={h} className={i % 2 === 1 ? "hidden sm:inline" : ""}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
            <div className="ml-auto shrink-0 text-right sm:ml-0 sm:w-28">
              <div className="text-2xl font-bold tabular-nums">{horarioDoPasso(passoVisivel)}</div>
              <div className="text-xs text-neutral-500">{ehHoje && passoVisivel >= maxPasso ? "agora" : `de 15 em 15 min`}</div>
            </div>
          </div>
          {ehHoje && <p className="text-xs text-neutral-500">Hoje a régua vai só até agora.</p>}
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-500">
          <input type="checkbox" checked={incluirTestes} onChange={(e) => setIncluirTestes(e.target.checked)} />
          Incluir peregrinações de teste (motivo &quot;Outros&quot; com &quot;teste&quot;)
        </label>
      </div>

      {erro && <div className="card border-red-300 text-sm text-red-700 dark:border-red-900 dark:text-red-400">{erro}</div>}

      {/* Números */}
      {resultado && (
        <div className="flex flex-wrap justify-center gap-3">
          <div className="card w-44 text-center" style={modo === "real" ? { borderColor: corReal } : undefined}>
            <div className="text-xs text-neutral-500">Real (com o app)</div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: corReal }}>
              {fmt(resultado.totalReal)}
            </div>
          </div>
          <div className="card w-44 text-center" style={modo === "simulado" ? { borderColor: corSim } : undefined}>
            <div className="text-xs text-neutral-500">Simulada (com os grupos)</div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: corSim }}>
              {fmt(resultado.totalSimulado)}
            </div>
          </div>
          <div className="card w-44 text-center">
            <div className="text-xs text-neutral-500">Cidades com gente</div>
            <div className="text-3xl font-bold tabular-nums">
              {fmt(resultado.cidades.filter((c) => c.chave !== SEM_CIDADE && (modo === "real" ? c.real : c.simulado) > 0).length)}
            </div>
          </div>
          {pico && pico[modo] > 0 && (
            <button
              type="button"
              className="card w-44 text-center transition hover:border-amber-400"
              onClick={() => {
                setTocando(false);
                setPasso(pico.passo);
              }}
            >
              <div className="text-xs text-neutral-500">Pico do dia ({modo === "real" ? "real" : "simulada"})</div>
              <div className="text-3xl font-bold tabular-nums">{fmt(pico[modo])}</div>
              <div className="text-xs text-neutral-500">às {pico.horario} — ver</div>
            </button>
          )}
        </div>
      )}

      {/* Mapa */}
      <div className="card flex flex-col gap-2 p-2">
        <p className="px-2 pt-1 text-sm font-semibold" style={{ textAlign: "left" }}>
          {modo === "real" ? "Real" : "Simulada"} — {dia.split("-").reverse().join("/")} às {rotuloHorario}
        </p>
        <MovimentoMapa cidades={resultado?.cidades ?? []} modo={modo} cor={corModo} maximo={maximoMapa} />
      </div>

      {/* Linha do dia */}
      {serie.length > 1 && (
        <div className="card">
          <p className="mb-2 text-sm font-semibold">Pessoas na estrada ao longo do dia</p>
          <div className="mb-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: corReal }} /> Real
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: corSim }} /> Simulada
            </span>
            <span className="text-neutral-500">Clique no gráfico para ir ao horário.</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={serie}
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                onClick={(estado) => {
                  const i = Number(estado?.activeTooltipIndex);
                  if (Number.isFinite(i)) {
                    setTocando(false);
                    setPasso(Math.min(maxPasso, i));
                  }
                }}
              >
                <CartesianGrid stroke={chrome.grid} vertical={false} />
                <XAxis
                  dataKey="horario"
                  tick={{ fontSize: 11, fill: chrome.text }}
                  stroke={chrome.axis}
                  interval={11}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chrome.text }} stroke={chrome.axis} />
                <Tooltip
                  contentStyle={{ background: chrome.surface, borderColor: chrome.axis, fontSize: 12 }}
                  formatter={(v, nome) => [fmt(Number(v)), nome === "real" ? "Real" : "Simulada"]}
                />
                <ReferenceLine x={horarioDoPasso(passoVisivel)} stroke={chrome.text} strokeDasharray="3 3" />
                <Line type="stepAfter" dataKey="real" stroke={corReal} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="simulado" stroke={corSim} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela por cidade */}
      {resultado && (
        <div className="card overflow-x-auto">
          <p className="mb-2 text-sm font-semibold">Por cidade às {rotuloHorario}</p>
          {resultado.cidades.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {carregando ? "Carregando..." : "Ninguém do app estava na estrada neste horário."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                  <th className="py-2 pr-2">Cidade</th>
                  <th className="py-2 pr-2 text-right">Real</th>
                  <th className="py-2 text-right">Simulada</th>
                </tr>
              </thead>
              <tbody>
                {resultado.cidades.map((c) => (
                  <tr key={c.chave} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className={`py-1.5 pr-2 ${c.chave === SEM_CIDADE ? "italic text-neutral-500" : ""}`}>{c.nome}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums" style={modo === "real" ? { fontWeight: 700, color: corReal } : undefined}>
                      {fmt(c.real)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums" style={modo === "simulado" ? { fontWeight: 700, color: corSim } : undefined}>
                      {fmt(c.simulado)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 pr-2">Total</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{fmt(resultado.totalReal)}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(resultado.totalSimulado)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Grupos */}
      {resultado && resultado.grupos.some((g) => g.grupo.como !== "sozinho") && (
        <div className="card overflow-x-auto">
          <p className="text-sm font-semibold">Grupos na estrada às {rotuloHorario}</p>
          <p className="mb-2 text-xs text-neutral-500">Nome e tamanho digitados pelo peregrino em &quot;Vou em grupo&quot; ao planejar.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                <th className="py-2 pr-2">Grupo</th>
                <th className="py-2 pr-2 text-right">Previsto</th>
                <th className="py-2 pr-2 text-right">Com o app agora</th>
                <th className="py-2 text-right">Com o app no dia</th>
              </tr>
            </thead>
            <tbody>
              {resultado.grupos
                .filter((g) => g.grupo.como !== "sozinho")
                .map(({ grupo, ativosAgora, estimados }) => (
                  <tr key={grupo.chave} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-1.5 pr-2">
                      {grupo.rotulo}
                      {grupo.romaria && (
                        <span className="ml-1 text-xs text-neutral-500">
                          (Romaria cadastrada: {fmt(grupo.romaria.quantidade)} pessoas)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmt(estimados)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmt(ativosAgora)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(grupo.membros.length)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {motor && motor.paradas.length > 0 && (
        <div className="card text-sm">
          <p className="mb-1 font-semibold">Peregrinações abertas sem sinal há mais de 24 horas</p>
          <p className="mb-2 text-xs text-neutral-500">
            Continuam &quot;em andamento&quot; no app, mas sem check-in nem posição há mais de 24 h (provavelmente não foram
            finalizadas). Contam só até 24 h depois do último sinal.
          </p>
          <ul className="list-disc pl-5">
            {motor.paradas.map((p) => (
              <li key={p.id}>
                {p.grupo}
                {p.tamanho ? ` (${fmt(p.tamanho)} ${p.tamanho === 1 ? "pessoa" : "pessoas"})` : ""} — início{" "}
                {new Date(p.inicio).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}, último sinal{" "}
                {new Date(p.ultimoSinal).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {romariasSemApp.length > 0 && (
        <div className="card text-sm">
          <p className="mb-1 font-semibold">Romarias cadastradas neste dia sem ninguém com o app</p>
          <p className="mb-2 text-xs text-neutral-500">
            Não entram no mapa (não há posição de ninguém delas). Só entram quando um peregrino usa o mesmo nome do grupo ao planejar.
          </p>
          <ul className="list-disc pl-5">
            {romariasSemApp.map((r) => (
              <li key={r.id}>
                {r.nome} — {fmt(r.quantidade)} pessoas, saindo de {r.cidade_origem}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="card text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Info size={16} /> Como a estimativa é feita
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-400">
          <li>
            <strong>Real</strong>: cada peregrino do app na estrada naquele horário conta 1, na cidade do último check-in automático até
            aquele horário (agora: a última posição enviada). Antes do primeiro check-in, conta na cidade de início.
          </li>
          <li>
            <strong>Simulada</strong>: quem planejou &quot;vou em grupo&quot; leva junto o resto do grupo (tamanho informado). Onde está quem tem
            o app, estão os outros.
          </li>
          <li>
            Mesmo grupo com mais de um peregrino no app é contado <strong>uma vez só</strong>: as pessoas do grupo são divididas entre as
            posições de quem tem o app. Mesmo grupo = mesmo nome (sem diferença de maiúsculas, acentos e espaços); sem nome = mesmo
            tamanho, mesma cidade de origem e mesmo dia de saída.
          </li>
          <li>
            Se o nome do grupo é igual ao de uma Romaria cadastrada em execução no dia, vale o maior número entre o informado e o da
            Romaria.
          </li>
          <li>
            O app não guarda o trajeto, só os check-ins por cidade: a régua mostra a cidade, não o ponto exato na estrada. Não aparecem
            nomes nem telefones.
          </li>
        </ul>
      </details>
    </div>
  );
}
