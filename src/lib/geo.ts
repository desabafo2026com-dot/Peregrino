// Distância aproximada entre duas coordenadas (fórmula de Haversine), em metros.
export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Rodada 24: pequeno utilitário para o mapa nunca "esconder" um marcador de
// PAP atrás de outro. Relatado pelo usuário: com 2 PAP aprovados, o mapa
// sem filtro mostrava só 1 — a causa mais provável, revisando todo o
// código de busca/filtro (que já mostra os dois, sem nenhum filtro de
// status escondendo um deles), é dois PAP com coordenadas iguais ou quase
// iguais (ex.: alguém que cadastrou sem ajustar o ponto exato no mapa),
// fazendo os dois marcadores se sobreporem exatamente e parecerem um só.
// Em vez de só documentar a suspeita, esta função corrige o sintoma de
// forma genérica: agrupa PAP cujas coordenadas caem no mesmo "balde" de
// ~15m e aplica, só a partir do segundo de cada grupo, um pequeno desvio
// determinístico (sempre o mesmo para o mesmo id, então o marcador não
// "pula" a cada nova renderização) — mesmo princípio já usado desde a
// Rodada 14 para PAP pré-cadastrado, aqui com um raio bem menor (a
// coordenada de um PAP real já devia ser exata; isso é só para o caso de
// duas ficarem coincidentes).
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

// ~15 metros em graus (aprox. na latitude do Brasil) — balde para agrupar
// coordenadas "praticamente iguais".
const BALDE_GRAUS = 0.00015;
// ~12 metros de raio de separação — o suficiente para os dois marcadores
// virarem clicáveis lado a lado, sem afastar visivelmente um PAP da sua
// posição real.
const RAIO_DESVIO_GRAUS = 0.00011;

export function comDesvioMinimoPap<T extends { id: string; latitude: number; longitude: number }>(
  pontos: T[]
): Map<string, { lat: number; lng: number }> {
  const grupos = new Map<string, T[]>();
  for (const p of pontos) {
    const chave = `${Math.round(p.latitude / BALDE_GRAUS)}:${Math.round(p.longitude / BALDE_GRAUS)}`;
    const lista = grupos.get(chave) ?? [];
    lista.push(p);
    grupos.set(chave, lista);
  }

  const resultado = new Map<string, { lat: number; lng: number }>();
  for (const grupo of grupos.values()) {
    grupo.forEach((p, i) => {
      if (i === 0) {
        resultado.set(p.id, { lat: p.latitude, lng: p.longitude });
        return;
      }
      const h = hashId(p.id);
      const angulo = (Math.abs(h) % 360) * (Math.PI / 180);
      // Cada PAP extra no mesmo balde gira um pouco mais, para não ficarem
      // todos no mesmo ponto ao redor do primeiro.
      const raio = RAIO_DESVIO_GRAUS * (1 + i * 0.6);
      resultado.set(p.id, {
        lat: p.latitude + Math.sin(angulo) * raio,
        lng: p.longitude + Math.cos(angulo) * raio,
      });
    });
  }
  return resultado;
}
