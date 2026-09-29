import { distanciaMetros } from "@/lib/geo";
import type { PontoCheckin } from "@/types/database";

// Rodada 47 — em qual cidade da rota o peregrino está agora, para o
// check-in. O ponto cadastrado de cada cidade é uma referência (às vezes a
// sede, fora da rodovia), mas o peregrino faz o check-in quase sempre na
// própria Dutra — por isso não existe mais a trava de "até 5 km do ponto"
// nem a confirmação: vale a cidade mais próxima de onde ele está, em
// qualquer ordem (se pulou uma cidade, registra direto na atual).
// Considera todas as cidades da caminhada (feitas ou não): se a mais
// próxima já tem check-in, a pessoa ainda está nela e nada é duplicado.
export function cidadeMaisProxima(
  lat: number,
  lng: number,
  pontos: PontoCheckin[]
): PontoCheckin | null {
  let melhor: { ponto: PontoCheckin; distancia: number } | null = null;
  for (const p of pontos) {
    const d = distanciaMetros(lat, lng, p.latitude, p.longitude);
    if (!melhor || d < melhor.distancia) melhor = { ponto: p, distancia: d };
  }
  return melhor?.ponto ?? null;
}
