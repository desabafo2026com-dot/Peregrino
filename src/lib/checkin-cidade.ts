import { distanciaMetros } from "@/lib/geo";
import type { PontoCheckin } from "@/types/database";

// Rodada 48 — check-ins das cidades do caminho.
//   - A cidade de início tem o check-in feito ao tocar "Iniciar caminhada".
//   - Aparecida tem o check-in feito ao tocar "Finalizar peregrinação",
//     conferindo a localização.
//   - As cidades do meio são registradas sozinhas, pelo gatilho
//     trg_checkin_automatico (Migration 42), enquanto a localização está
//     compartilhada e o app aberto; o botão "Registrar agora" usa a mesma
//     regra, aqui no aparelho.
// A regra: a cidade da caminhada mais próxima da posição atual, se estiver
// a até RAIO_CHECKIN_AUTOMATICO_KM e não for a de início nem Aparecida. O
// ponto de referência de algumas cidades fica na sede, fora da rodovia —
// daí o raio folgado. Mesmos números da Migration 42.
export const RAIO_CHECKIN_AUTOMATICO_KM = 8;

export function cidadeDoCaminhoProxima(
  lat: number,
  lng: number,
  pontos: PontoCheckin[]
): PontoCheckin | null {
  if (pontos.length < 3) return null;
  const ordenados = [...pontos].sort((a, b) => a.ordem - b.ordem);
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  let melhor: { ponto: PontoCheckin; distancia: number } | null = null;
  for (const p of ordenados) {
    const d = distanciaMetros(lat, lng, p.latitude, p.longitude);
    if (!melhor || d < melhor.distancia) melhor = { ponto: p, distancia: d };
  }
  if (!melhor) return null;
  if (melhor.distancia > RAIO_CHECKIN_AUTOMATICO_KM * 1000) return null;
  if (melhor.ponto.id === primeiro.id || melhor.ponto.id === ultimo.id) return null;
  return melhor.ponto;
}
