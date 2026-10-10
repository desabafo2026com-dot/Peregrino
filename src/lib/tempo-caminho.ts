// Rodada 64 — previsão do tempo nas cidades do caminho (próximas horas),
// do serviço gratuito do Open-Meteo (open-meteo.com). Uma chamada só para
// todas as cidades; a resposta fica guardada no servidor por 30 minutos.

export interface CidadeTempo {
  cidade: string;
  lat: number;
  lng: number;
}

export interface PrevisaoCidade {
  cidade: string;
  agoraTemp: number | null;
  agoraCodigo: number | null;
  maxTemp: number | null; // próximas 12 h
  minTemp: number | null;
  chuvaProb: number | null; // % máxima nas próximas 12 h
  chuvaMm: number; // soma nas próximas 12 h
  ventoMax: number | null; // km/h
  horaChuva: string | null; // primeira hora com chance >= 60%
}

interface RespostaOpenMeteo {
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    wind_speed_10m: (number | null)[];
    weather_code: (number | null)[];
  };
}

const HORAS = 12;

export async function previsaoCaminho(cidades: CidadeTempo[]): Promise<PrevisaoCidade[] | null> {
  if (cidades.length === 0) return [];
  const lista = cidades.slice(0, 20);
  const url =
    `${process.env.OPEN_METEO_BASE ?? "https://api.open-meteo.com"}/v1/forecast?latitude=` +
    lista.map((c) => c.lat.toFixed(3)).join(",") +
    "&longitude=" +
    lista.map((c) => c.lng.toFixed(3)).join(",") +
    "&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code" +
    "&timezone=America%2FSao_Paulo&forecast_days=2";
  let dados: RespostaOpenMeteo[];
  try {
    const resp = await fetch(url, { next: { revalidate: 30 * 60 } });
    if (!resp.ok) return null;
    const json = await resp.json();
    dados = Array.isArray(json) ? json : [json];
  } catch {
    return null;
  }
  if (dados.length !== lista.length) return null;

  // Hora atual em Brasília no formato do Open-Meteo ("2026-10-10T14:00").
  const agora = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T")
    .slice(0, 13);

  return lista.map((c, i) => {
    const h = dados[i]?.hourly;
    if (!h) {
      return { cidade: c.cidade, agoraTemp: null, agoraCodigo: null, maxTemp: null, minTemp: null, chuvaProb: null, chuvaMm: 0, ventoMax: null, horaChuva: null };
    }
    let ini = h.time.findIndex((t) => t.slice(0, 13) === agora);
    if (ini < 0) ini = 0;
    const fim = Math.min(h.time.length, ini + HORAS);
    const fatia = <T,>(arr: (T | null)[]) => arr.slice(ini, fim).filter((v): v is T => v != null);
    const temps = fatia(h.temperature_2m);
    const probs = fatia(h.precipitation_probability);
    const ventos = fatia(h.wind_speed_10m);
    let horaChuva: string | null = null;
    for (let k = ini; k < fim; k++) {
      if ((h.precipitation_probability[k] ?? 0) >= 60) {
        horaChuva = h.time[k].slice(11, 16);
        break;
      }
    }
    return {
      cidade: c.cidade,
      agoraTemp: h.temperature_2m[ini] ?? null,
      agoraCodigo: h.weather_code[ini] ?? null,
      maxTemp: temps.length ? Math.max(...temps) : null,
      minTemp: temps.length ? Math.min(...temps) : null,
      chuvaProb: probs.length ? Math.max(...probs) : null,
      chuvaMm: Math.round(fatia(h.precipitation).reduce((s, v) => s + v, 0) * 10) / 10,
      ventoMax: ventos.length ? Math.max(...ventos) : null,
      horaChuva,
    };
  });
}

// Códigos de tempo da OMS usados pelo Open-Meteo, em palavras simples.
export function descricaoTempo(codigo: number | null): string {
  if (codigo == null) return "—";
  if (codigo === 0) return "Céu limpo";
  if (codigo <= 2) return "Poucas nuvens";
  if (codigo === 3) return "Nublado";
  if (codigo === 45 || codigo === 48) return "Neblina";
  if (codigo >= 51 && codigo <= 57) return "Garoa";
  if (codigo >= 61 && codigo <= 67) return "Chuva";
  if (codigo >= 80 && codigo <= 82) return "Pancadas de chuva";
  if (codigo >= 95) return "Tempestade";
  return "Instável";
}
