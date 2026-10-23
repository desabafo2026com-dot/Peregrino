// Rodada 80 — Pessoas por cidade (Admin). Cálculo feito no navegador a
// partir do que a função admin_movimento_cidades (Migration 66) devolve.
//
// Real: cada peregrino do app que estava na estrada naquele horário conta 1,
// na cidade do último check-in até aquele horário (ou na última posição,
// se for agora). Antes do primeiro check-in, conta na cidade de início.
//
// Simulada: soma o resto do grupo de cada um. Quem planejou dizendo "vou em
// grupo de N pessoas" leva junto as pessoas que não têm o app. Se mais de
// um peregrino do mesmo grupo tem o app, o grupo é contado uma vez só:
// as N pessoas são divididas entre as posições dos que têm o app.

export interface PeregMov {
  id: string;
  status: string;
  inicio: string;
  fim: string | null;
  em_grupo: boolean;
  nome_grupo: string | null;
  tamanho_grupo: number | null;
  cidade_inicio: string | null;
  cidade_origem: string | null;
  inicio_lat: number | null;
  inicio_lon: number | null;
  motivo: string | null;
  motivo_outro_desc: string | null;
  perfil_motivo: string | null;
  perfil_motivo_outro_desc: string | null;
}

export interface EventoMov {
  peregrinacao_id: string;
  em: string;
  cidade: string | null;
  ibge: number | null;
  lat: number | null;
  lon: number | null;
  tipo: "checkin" | "agora";
}

export interface RomariaMov {
  id: string;
  nome: string;
  cidade_origem: string;
  quantidade: number;
  data_inicio: string;
  previsao_dias: number;
}

export interface DadosMovimento {
  dia: string;
  gerado_em: string;
  peregrinacoes: PeregMov[];
  eventos: EventoMov[];
  romarias: RomariaMov[];
}

export type ComoAgrupou = "nome" | "origem" | "sozinho";

export interface Grupo {
  chave: string;
  rotulo: string;
  como: ComoAgrupou;
  tamanho: number;
  tamanhoDeclarado: number | null;
  romaria: RomariaMov | null;
  membros: string[]; // ids de peregrinação, em ordem fixa
}

export interface CidadeContagem {
  chave: string;
  nome: string;
  lat: number | null;
  lon: number | null;
  real: number;
  simulado: number;
}

export interface ResultadoMomento {
  cidades: CidadeContagem[];
  totalReal: number;
  totalSimulado: number;
  grupos: { grupo: Grupo; ativosAgora: number; estimados: number }[];
}

export const SEM_CIDADE = "__sem_cidade__";
// Peregrinação "em andamento" sem nenhum sinal (check-in ou posição) há mais
// que isto deixa de contar como na estrada: muita gente não finaliza no app.
export const HORAS_SEM_SINAL = 24;

export interface PeregParada {
  id: string;
  grupo: string;
  tamanho: number | null;
  inicio: string;
  ultimoSinal: string;
}
export const MINUTOS_PASSO = 15;
export const PASSOS_DIA = (24 * 60) / MINUTOS_PASSO;

export function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Brasil sem horário de verão desde 2019: Brasília = UTC−3 o ano todo.
export function inicioDoDia(dia: string): Date {
  return new Date(`${dia}T00:00:00-03:00`);
}

export function hojeEmBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function horarioDoPasso(passo: number): string {
  const min = passo * MINUTOS_PASSO;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function diaLocal(iso: string): string {
  return hojeEmBrasilia(new Date(iso));
}

export function montarGrupos(peregs: PeregMov[], romarias: RomariaMov[]): Grupo[] {
  const romariaPorNome = new Map<string, RomariaMov>();
  for (const r of romarias) {
    const k = normalizar(r.nome);
    const atual = romariaPorNome.get(k);
    if (!atual || r.quantidade > atual.quantidade) romariaPorNome.set(k, r);
  }

  const mapa = new Map<string, Grupo>();
  const ordenados = [...peregs].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id));

  for (const p of ordenados) {
    const tam = p.tamanho_grupo && p.tamanho_grupo > 0 ? p.tamanho_grupo : null;
    let chave: string;
    let como: ComoAgrupou;
    let rotulo: string;
    const nome = normalizar(p.nome_grupo);
    if (p.em_grupo && nome) {
      chave = `n:${nome}`;
      como = "nome";
      rotulo = (p.nome_grupo ?? "").trim();
    } else if (p.em_grupo && tam && tam > 1) {
      // Sem nome: mesmo tamanho, mesma origem e mesmo dia de saída = mesmo grupo.
      const origem = p.cidade_origem || p.cidade_inicio || "";
      chave = `o:${normalizar(origem)}|${diaLocal(p.inicio)}|${tam}`;
      como = "origem";
      rotulo = `Grupo sem nome de ${tam} pessoas${origem ? ` saindo de ${origem}` : ""}`;
    } else {
      chave = `i:${p.id}`;
      como = "sozinho";
      rotulo = "Sozinho";
    }

    let g = mapa.get(chave);
    if (!g) {
      const romaria = como === "nome" ? romariaPorNome.get(nome) ?? null : null;
      g = { chave, rotulo, como, tamanho: 1, tamanhoDeclarado: null, romaria, membros: [] };
      mapa.set(chave, g);
    }
    g.membros.push(p.id);
    if (tam && (g.tamanhoDeclarado == null || tam > g.tamanhoDeclarado)) g.tamanhoDeclarado = tam;
  }

  for (const g of mapa.values()) {
    g.tamanho = Math.max(g.membros.length, g.tamanhoDeclarado ?? 1, g.romaria?.quantidade ?? 0);
  }
  return [...mapa.values()];
}

interface Posicao {
  chave: string;
  nome: string;
  lat: number | null;
  lon: number | null;
}

export class MotorMovimento {
  private peregs: Map<string, PeregMov>;
  private eventos: Map<string, { t: number; ev: EventoMov }[]>;
  readonly grupos: Grupo[];
  readonly paradas: PeregParada[] = [];
  private fimEfetivo = new Map<string, number>();

  constructor(peregs: PeregMov[], eventos: EventoMov[], romarias: RomariaMov[], agora = Date.now()) {
    this.peregs = new Map(peregs.map((p) => [p.id, p]));
    this.eventos = new Map();
    for (const ev of eventos) {
      if (!this.peregs.has(ev.peregrinacao_id)) continue;
      const lista = this.eventos.get(ev.peregrinacao_id) ?? [];
      lista.push({ t: new Date(ev.em).getTime(), ev });
      this.eventos.set(ev.peregrinacao_id, lista);
    }
    for (const lista of this.eventos.values()) lista.sort((a, b) => a.t - b.t);
    for (const p of peregs) {
      const inicio = new Date(p.inicio).getTime();
      if (p.fim) {
        this.fimEfetivo.set(p.id, new Date(p.fim).getTime());
        continue;
      }
      const lista = this.eventos.get(p.id) ?? [];
      const ultimo = Math.max(inicio, lista.length ? lista[lista.length - 1].t : inicio);
      const limite = ultimo + HORAS_SEM_SINAL * 3600 * 1000;
      if (limite < agora) {
        this.fimEfetivo.set(p.id, limite);
        this.paradas.push({
          id: p.id,
          grupo: p.em_grupo ? (p.nome_grupo?.trim() || "Grupo sem nome") : "Sozinho",
          tamanho: p.em_grupo ? p.tamanho_grupo : 1,
          inicio: p.inicio,
          ultimoSinal: new Date(ultimo).toISOString(),
        });
      }
    }
    this.paradas.sort((a, b) => a.ultimoSinal.localeCompare(b.ultimoSinal));
    this.grupos = montarGrupos(peregs, romarias);
  }

  posicao(id: string, t: number): Posicao | null {
    const p = this.peregs.get(id);
    if (!p) return null;
    if (t < new Date(p.inicio).getTime()) return null;
    const fim = this.fimEfetivo.get(id);
    if (fim != null && t > fim) return null;
    const lista = this.eventos.get(id) ?? [];
    let ultimo: EventoMov | null = null;
    for (const item of lista) {
      if (item.t <= t) ultimo = item.ev;
      else break;
    }
    if (ultimo && ultimo.cidade) {
      return { chave: normalizar(ultimo.cidade), nome: ultimo.cidade, lat: ultimo.lat, lon: ultimo.lon };
    }
    if (!ultimo && p.cidade_inicio && p.inicio_lat != null && p.inicio_lon != null) {
      return { chave: normalizar(p.cidade_inicio), nome: p.cidade_inicio, lat: p.inicio_lat, lon: p.inicio_lon };
    }
    return { chave: SEM_CIDADE, nome: "Sem cidade identificada", lat: null, lon: null };
  }

  momento(t: number): ResultadoMomento {
    const cidades = new Map<string, CidadeContagem>();
    const somar = (pos: Posicao, real: number, sim: number) => {
      let c = cidades.get(pos.chave);
      if (!c) {
        c = { chave: pos.chave, nome: pos.nome, lat: pos.lat, lon: pos.lon, real: 0, simulado: 0 };
        cidades.set(pos.chave, c);
      }
      if (c.lat == null && pos.lat != null) {
        c.lat = pos.lat;
        c.lon = pos.lon;
      }
      c.real += real;
      c.simulado += sim;
    };

    let totalReal = 0;
    let totalSimulado = 0;
    const grupos: ResultadoMomento["grupos"] = [];

    for (const g of this.grupos) {
      const ativos: Posicao[] = [];
      for (const id of g.membros) {
        const pos = this.posicao(id, t);
        if (pos) ativos.push(pos);
      }
      if (ativos.length === 0) continue;
      const k = ativos.length;
      const extras = Math.max(0, g.tamanho - k);
      const base = Math.floor(extras / k);
      const resto = extras % k;
      ativos.forEach((pos, i) => somar(pos, 1, 1 + base + (i < resto ? 1 : 0)));
      totalReal += k;
      totalSimulado += k + extras;
      grupos.push({ grupo: g, ativosAgora: k, estimados: k + extras });
    }

    return {
      cidades: [...cidades.values()].sort((a, b) => b.simulado - a.simulado || b.real - a.real || a.nome.localeCompare(b.nome)),
      totalReal,
      totalSimulado,
      grupos: grupos.sort((a, b) => b.estimados - a.estimados),
    };
  }
}
