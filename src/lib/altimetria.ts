// Rodada 64 — altimetria aproximada do trajeto (perfil de subidas e
// descidas). O trajeto é a linha que liga as cidades de check-in da rota,
// amostrada a cada ~1,5 km; a altitude de cada amostra vem do serviço
// gratuito de elevação do Open-Meteo (open-meteo.com, dados de modelo de
// terreno). A Dutra acompanha bem essa linha no Vale do Paraíba, mas o
// resultado é uma aproximação — por isso a tela fala em "perfil aproximado".
// A resposta fica guardada no servidor por 30 dias (a altitude não muda).

import type { PontoCheckin } from "@/types/database";

export interface AmostraAltimetria {
  km: number;
  alt: number;
}

export interface CidadeAltimetria {
  cidade: string;
  km: number;
  alt: number;
}

export interface PerfilAltimetria {
  amostras: AmostraAltimetria[];
  cidades: CidadeAltimetria[];
  subidaTotal: number;
  descidaTotal: number;
  altMin: number;
  altMax: number;
  kmTotal: number;
}

const PASSO_KM = 1.5;
const LOTE = 100; // máximo de coordenadas por chamada

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function buscarElevacoes(coords: { lat: number; lng: number }[]): Promise<number[] | null> {
  const resultado: number[] = [];
  for (let i = 0; i < coords.length; i += LOTE) {
    const lote = coords.slice(i, i + LOTE);
    const url =
      `${process.env.OPEN_METEO_BASE ?? "https://api.open-meteo.com"}/v1/elevation?latitude=` +
      lote.map((c) => c.lat.toFixed(4)).join(",") +
      "&longitude=" +
      lote.map((c) => c.lng.toFixed(4)).join(",");
    try {
      const resp = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
      if (!resp.ok) return null;
      const dados = (await resp.json()) as { elevation?: number[] };
      if (!Array.isArray(dados.elevation) || dados.elevation.length !== lote.length) return null;
      resultado.push(...dados.elevation);
    } catch {
      return null;
    }
  }
  return resultado;
}

// Média móvel de 3 pontos — tira o "serrilhado" do modelo de terreno sem
// achatar as subidas de verdade.
function suavizar(valores: number[]) {
  return valores.map((v, i) => {
    const a = valores[i - 1] ?? v;
    const c = valores[i + 1] ?? v;
    return (a + v + c) / 3;
  });
}

export async function perfilAltimetria(pontosRota: PontoCheckin[]): Promise<PerfilAltimetria | null> {
  const pontos = [...pontosRota].sort((a, b) => a.ordem - b.ordem);
  if (pontos.length < 2) return null;

  // Distância acumulada pela linha entre as cidades; quando todas têm o km
  // aproximado cadastrado, ele é usado como referência de cada cidade.
  const usarKmCadastrado = pontos.every((p) => p.km_aproximado != null);
  const kmCidade: number[] = [];
  let acumulado = 0;
  pontos.forEach((p, i) => {
    if (i > 0) acumulado += distanciaKm(pontos[i - 1].latitude, pontos[i - 1].longitude, p.latitude, p.longitude);
    kmCidade.push(
      usarKmCadastrado ? Math.abs(Number(p.km_aproximado) - Number(pontos[0].km_aproximado)) : acumulado
    );
  });

  const coords: { lat: number; lng: number; km: number }[] = [];
  for (let i = 0; i < pontos.length - 1; i++) {
    const a = pontos[i];
    const b = pontos[i + 1];
    const kmA = kmCidade[i];
    const kmB = kmCidade[i + 1];
    const passos = Math.max(1, Math.ceil(Math.abs(kmB - kmA) / PASSO_KM));
    for (let s = 0; s < passos; s++) {
      const t = s / passos;
      coords.push({
        lat: a.latitude + (b.latitude - a.latitude) * t,
        lng: a.longitude + (b.longitude - a.longitude) * t,
        km: kmA + (kmB - kmA) * t,
      });
    }
  }
  const ultimo = pontos[pontos.length - 1];
  coords.push({ lat: ultimo.latitude, lng: ultimo.longitude, km: kmCidade[kmCidade.length - 1] });

  const elevacoes = await buscarElevacoes(coords);
  if (!elevacoes) return null;
  const suaves = suavizar(elevacoes);

  const amostras = coords.map((c, i) => ({ km: Math.round(c.km * 10) / 10, alt: Math.round(suaves[i]) }));
  let subida = 0;
  let descida = 0;
  for (let i = 1; i < amostras.length; i++) {
    const d = amostras[i].alt - amostras[i - 1].alt;
    if (d > 0) subida += d;
    else descida -= d;
  }

  const cidades = pontos.map((p, i) => {
    const km = Math.round(kmCidade[i] * 10) / 10;
    const maisPerto = amostras.reduce((m, a) => (Math.abs(a.km - km) < Math.abs(m.km - km) ? a : m), amostras[0]);
    return { cidade: p.cidade, km, alt: maisPerto.alt };
  });

  return {
    amostras,
    cidades,
    subidaTotal: Math.round(subida),
    descidaTotal: Math.round(descida),
    altMin: Math.min(...amostras.map((a) => a.alt)),
    altMax: Math.max(...amostras.map((a) => a.alt)),
    kmTotal: amostras[amostras.length - 1].km,
  };
}

// Subida e descida entre dois km do perfil (ex.: "próximos 10 km").
export function subidaEntre(perfil: PerfilAltimetria, kmDe: number, kmAte: number) {
  let subida = 0;
  let descida = 0;
  const trecho = perfil.amostras.filter((a) => a.km >= kmDe && a.km <= kmAte);
  for (let i = 1; i < trecho.length; i++) {
    const d = trecho[i].alt - trecho[i - 1].alt;
    if (d > 0) subida += d;
    else descida -= d;
  }
  return { subida: Math.round(subida), descida: Math.round(descida) };
}
