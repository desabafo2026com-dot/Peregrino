import { CloudRain, Droplets, Sun, ThermometerSun, Wind } from "lucide-react";
import { descricaoTempo, type PrevisaoCidade } from "@/lib/tempo-caminho";

// Rodada 64 — tempo nas cidades do caminho, próximas 12 horas, com avisos
// de calor forte, chuva provável e vento forte (sempre com ícone e texto).

function fmt(n: number | null, sufixo: string) {
  return n == null ? "—" : `${Math.round(n)}${sufixo}`;
}

export default function TempoNoCaminho({ previsoes }: { previsoes: PrevisaoCidade[] }) {
  if (previsoes.length === 0) return null;
  const calor = previsoes.filter((p) => (p.maxTemp ?? 0) >= 32).map((p) => p.cidade);
  const chuva = previsoes.filter((p) => (p.chuvaProb ?? 0) >= 60);
  const vento = previsoes.filter((p) => (p.ventoMax ?? 0) >= 40).map((p) => p.cidade);

  return (
    <div className="flex flex-col gap-3">
      {(calor.length > 0 || chuva.length > 0 || vento.length > 0) && (
        <div className="flex flex-col gap-2">
          {calor.length > 0 && (
            <p
              className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
              style={{ textAlign: "left" }}
            >
              <ThermometerSun size={18} className="mt-0.5 shrink-0" />
              <span>
                <strong>Calor forte</strong> em {calor.join(", ")}. Beba água a cada parada, use chapéu e protetor,
                e evite caminhar entre 11h e 15h.
              </span>
            </p>
          )}
          {chuva.length > 0 && (
            <p
              className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
              style={{ textAlign: "left" }}
            >
              <CloudRain size={18} className="mt-0.5 shrink-0" />
              <span>
                <strong>Chuva provável</strong>:{" "}
                {chuva.map((p) => `${p.cidade}${p.horaChuva ? ` (a partir das ${p.horaChuva})` : ""}`).join(", ")}.
                Capa de chuva e roupa clara — o acostamento molhado fica escorregadio e a visibilidade cai.
              </span>
            </p>
          )}
          {vento.length > 0 && (
            <p
              className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              style={{ textAlign: "left" }}
            >
              <Wind size={18} className="mt-0.5 shrink-0" />
              <span>
                <strong>Vento forte</strong> em {vento.join(", ")}. Atenção ao deslocamento de ar dos caminhões.
              </span>
            </p>
          )}
        </div>
      )}

      <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {previsoes.map((p) => (
          <li key={p.cidade} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{p.cidade}</span>
              <span className="block text-xs text-neutral-500">
                Agora: {fmt(p.agoraTemp, "°C")} · {descricaoTempo(p.agoraCodigo)}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-neutral-600 tabular-nums dark:text-neutral-300">
              <span className="flex items-center gap-1">
                <Sun size={13} /> {fmt(p.minTemp, "°")} / {fmt(p.maxTemp, "°")}
              </span>
              <span className="flex items-center gap-1">
                <Droplets size={13} /> {fmt(p.chuvaProb, "%")}
                {p.chuvaMm > 0 ? ` · ${p.chuvaMm} mm` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Wind size={13} /> {fmt(p.ventoMax, " km/h")}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Próximas 12 horas (mínima/máxima, maior chance de chuva e vento). Atualizado a cada 30 minutos. Dados:
        Open-Meteo.com.
      </p>
    </div>
  );
}
