"use client";

import { useMemo, useRef, useState } from "react";
import { Mountain, TrendingDown, TrendingUp } from "lucide-react";
import type { PerfilAltimetria } from "@/lib/altimetria";

// Rodada 64 — gráfico do perfil de altitude do trajeto (área com linha),
// com as cidades de check-in marcadas, a posição do peregrino (quando há
// peregrinação em andamento) e leitura por toque/mouse (linha vertical +
// valor). Abaixo, a tabela com a altitude de cada cidade.

const L = 640;
const A = 260;
// Margens e letras em unidades do desenho (no celular o gráfico encolhe
// ~45%, então o texto de 19 fica com ~9–10 px na tela).
const M = { esq: 74, dir: 14, topo: 16, base: 40 };

function arredondarPara(n: number, passo: number, cima: boolean) {
  return (cima ? Math.ceil(n / passo) : Math.floor(n / passo)) * passo;
}

export default function AltimetriaGrafico({
  perfil,
  kmAtual = null,
  proximos = null,
}: {
  perfil: PerfilAltimetria;
  kmAtual?: number | null;
  // Subida/descida dos próximos km a partir da posição atual.
  proximos?: { km: number; subida: number; descida: number } | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [foco, setFoco] = useState<number | null>(null);

  const { yMin, yMax, x, y, caminhoLinha, caminhoArea, ticksY, ticksX } = useMemo(() => {
    const yMin = arredondarPara(perfil.altMin - 20, 50, false);
    const yMax = arredondarPara(perfil.altMax + 20, 50, true);
    const kmMax = Math.max(1, perfil.kmTotal);
    const x = (km: number) => M.esq + (km / kmMax) * (L - M.esq - M.dir);
    const y = (alt: number) => M.topo + (1 - (alt - yMin) / Math.max(1, yMax - yMin)) * (A - M.topo - M.base);
    const pts = perfil.amostras.map((a) => `${x(a.km).toFixed(1)},${y(a.alt).toFixed(1)}`);
    const caminhoLinha = `M${pts.join(" L")}`;
    const caminhoArea = `${caminhoLinha} L${x(perfil.kmTotal).toFixed(1)},${A - M.base} L${M.esq},${A - M.base} Z`;
    const passoY = yMax - yMin > 400 ? 200 : 100;
    const ticksY: number[] = [];
    for (let v = arredondarPara(yMin, passoY, true); v <= yMax; v += passoY) ticksY.push(v);
    const passoX = kmMax > 120 ? 50 : kmMax > 50 ? 20 : 10;
    const ticksX: number[] = [];
    for (let v = 0; v <= kmMax; v += passoX) ticksX.push(v);
    return { yMin, yMax, x, y, caminhoLinha, caminhoArea, ticksY, ticksX };
  }, [perfil]);

  function mover(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * L;
    const km = ((px - M.esq) / (L - M.esq - M.dir)) * perfil.kmTotal;
    let melhor = 0;
    perfil.amostras.forEach((a, i) => {
      if (Math.abs(a.km - km) < Math.abs(perfil.amostras[melhor].km - km)) melhor = i;
    });
    setFoco(melhor);
  }

  const amostraFoco = foco != null ? perfil.amostras[foco] : null;
  const cidadePerto = amostraFoco
    ? perfil.cidades.reduce((m, c) => (Math.abs(c.km - amostraFoco.km) < Math.abs(m.km - amostraFoco.km) ? c : m))
    : null;
  const altAtual =
    kmAtual != null
      ? perfil.amostras.reduce((m, a) => (Math.abs(a.km - kmAtual) < Math.abs(m.km - kmAtual) ? a : m)).alt
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700 dark:text-neutral-300">
        <span className="flex items-center gap-1">
          <TrendingUp size={16} className="text-neutral-500" /> Subida total ≈ <strong>{perfil.subidaTotal} m</strong>
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown size={16} className="text-neutral-500" /> Descida ≈ <strong>{perfil.descidaTotal} m</strong>
        </span>
        <span className="flex items-center gap-1">
          <Mountain size={16} className="text-neutral-500" /> {perfil.altMin} a {perfil.altMax} m
        </span>
      </div>

      {proximos && (
        <p
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          style={{ textAlign: "left" }}
        >
          Próximos {proximos.km} km: sobe ≈ <strong>{proximos.subida} m</strong> e desce ≈{" "}
          <strong>{proximos.descida} m</strong>.
          {proximos.subida >= 120 && " Trecho puxado: vá no seu ritmo e beba água."}
        </p>
      )}

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${L} ${A}`}
          className="w-full touch-pan-y select-none"
          role="img"
          aria-label={`Perfil de altitude do trajeto: de ${perfil.altMin} a ${perfil.altMax} metros em ${perfil.kmTotal} km`}
          onPointerMove={(e) => mover(e.clientX)}
          onPointerDown={(e) => mover(e.clientX)}
          onPointerLeave={() => setFoco(null)}
        >
          {/* grade e eixos */}
          {ticksY.map((v) => (
            <g key={`y${v}`}>
              <line
                x1={M.esq}
                x2={L - M.dir}
                y1={y(v)}
                y2={y(v)}
                className="stroke-neutral-200 dark:stroke-neutral-800"
                strokeWidth={1}
              />
              <text
                x={M.esq - 6}
                y={y(v) + 6}
                textAnchor="end"
                className="fill-neutral-500 text-[19px]"
              >
                {v} m
              </text>
            </g>
          ))}
          {ticksX.map((v) => (
            <text
              key={`x${v}`}
              x={x(v)}
              y={A - M.base + 28}
              textAnchor="middle"
              className="fill-neutral-500 text-[19px]"
            >
              {v} km
            </text>
          ))}

          {/* área + linha */}
          <path d={caminhoArea} className="fill-[#1f3b6b]/10 dark:fill-[#9fbbe8]/15" />
          <path
            d={caminhoLinha}
            fill="none"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-[#1f3b6b] dark:stroke-[#9fbbe8]"
          />

          {/* cidades de check-in */}
          {perfil.cidades.map((c) => (
            <circle
              key={c.cidade + c.km}
              cx={x(c.km)}
              cy={y(c.alt)}
              r={6}
              strokeWidth={3}
              className="fill-[#1f3b6b] stroke-white dark:fill-[#9fbbe8] dark:stroke-neutral-950"
            >
              <title>{`${c.cidade} — km ${c.km} — ${c.alt} m`}</title>
            </circle>
          ))}

          {/* posição do peregrino */}
          {kmAtual != null && altAtual != null && (
            <g>
              <line
                x1={x(kmAtual)}
                x2={x(kmAtual)}
                y1={M.topo}
                y2={A - M.base}
                stroke="#e0892b"
                strokeWidth={2}
                strokeDasharray="0"
              />
              <circle cx={x(kmAtual)} cy={y(altAtual)} r={9} fill="#e0892b" stroke="white" strokeWidth={3} />
            </g>
          )}

          {/* leitura por toque */}
          {amostraFoco && (
            <g pointerEvents="none">
              <line
                x1={x(amostraFoco.km)}
                x2={x(amostraFoco.km)}
                y1={M.topo}
                y2={A - M.base}
                className="stroke-neutral-400"
                strokeWidth={1}
              />
              <circle
                cx={x(amostraFoco.km)}
                cy={y(amostraFoco.alt)}
                r={8}
                strokeWidth={3}
                className="fill-[#1f3b6b] stroke-white dark:fill-[#9fbbe8] dark:stroke-neutral-950"
              />
            </g>
          )}
          <rect x={M.esq} y={M.topo} width={L - M.esq - M.dir} height={A - M.topo - M.base} fill="transparent" />
        </svg>

        {amostraFoco && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg border border-neutral-200 bg-white/95 px-2 py-1 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900/95"
            style={{
              left: `${(x(amostraFoco.km) / L) * 100}%`,
              transform: x(amostraFoco.km) > L * 0.6 ? "translateX(-105%)" : "translateX(5%)",
            }}
          >
            <strong className="text-sm">{amostraFoco.alt} m</strong>
            <span className="block text-neutral-500">
              km {amostraFoco.km}
              {cidadePerto ? ` · perto de ${cidadePerto.cidade}` : ""}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Perfil aproximado, pela linha entre as cidades de check-in. Toque no gráfico para ver a altitude.
        {kmAtual != null && " O ponto laranja é onde você está (último check-in)."} Dados de elevação: Open-Meteo.com.
        Faixa do gráfico: {yMin} a {yMax} m.
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-500">
          Altitude em cada cidade
        </summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-xs text-neutral-500">
              <th className="py-1 font-medium">Cidade</th>
              <th className="py-1 text-right font-medium">Km</th>
              <th className="py-1 text-right font-medium">Altitude</th>
            </tr>
          </thead>
          <tbody>
            {perfil.cidades.map((c) => (
              <tr key={c.cidade + c.km} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-1">{c.cidade}</td>
                <td className="py-1 text-right tabular-nums">{c.km}</td>
                <td className="py-1 text-right tabular-nums">{c.alt} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
