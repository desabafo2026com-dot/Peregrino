"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Tent, Search, MousePointerClick } from "lucide-react";
import { SENTIDO_KM_ABREV } from "@/lib/constants";
import type { PontoApoio } from "@/types/database";
import type { PapPreCadastroMapa } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  pontosApoio: PontoApoio[];
  papsPreCadastro: PapPreCadastroMapa[];
  isAdmin?: boolean;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mesmo critério de "ativo hoje" já usado no contador da home e no popup do
// mapa (ver ativoHoje em MapView.tsx): precisa estar marcado como ativo e
// ter a data de hoje no próprio calendário de funcionamento. PAP sem
// nenhuma data marcada nunca entra no filtro, mesmo estando aprovado.
function papAtivoAgora(p: PontoApoio) {
  return p.ativo && p.datas_funcionamento.length > 0 && p.datas_funcionamento.includes(hojeISO());
}

function preCadastroAtivoAgora(p: PapPreCadastroMapa) {
  const datas = p.datas_funcionamento ?? [];
  return datas.length > 0 && datas.includes(hojeISO());
}

// Rodada 42 — busca sem diferenciar maiúsculas nem acentos ("sao jose"
// encontra "São José dos Campos").
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

interface ItemBusca {
  chave: string;
  nome: string;
  cidade: string;
  km: number | null;
  sentido: string | null;
  confirmado: boolean;
  ativoHoje: boolean;
}

const LIMITE_INICIAL = 30;

// Rodada 20: a pedido do usuário, esta página passou a mostrar só PAP — as
// camadas de locais de risco, avisos de peregrinos e rotas Norte/Sul (que
// existiam desde as Rodadas 3/4/8) saíram daqui (continuam em /rotas, que
// já tinha seu próprio mapa de riscos). Sobra um único filtro, "PAP ativos
// agora", desmarcado por padrão — todos os PAP (vinculados e aguardando
// vínculo) aparecem de cara, e marcar o filtro estreita para só os que
// estão ativos neste momento (mesmo critério do contador "PAP ativos" da
// home).
export default function MapClient({ pontosApoio, papsPreCadastro, isAdmin = false }: Props) {
  const [somenteAtivos, setSomenteAtivos] = useState(false);
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(LIMITE_INICIAL);
  const [foco, setFoco] = useState<{ chave: string; seq: number } | null>(null);
  const mapaRef = useRef<HTMLDivElement>(null);

  const pontosApoioVisiveis = useMemo(
    () => (somenteAtivos ? pontosApoio.filter(papAtivoAgora) : pontosApoio),
    [somenteAtivos, pontosApoio]
  );
  const papsPreCadastroVisiveis = useMemo(
    () => (somenteAtivos ? papsPreCadastro.filter(preCadastroAtivoAgora) : papsPreCadastro),
    [somenteAtivos, papsPreCadastro]
  );

  // Rodada 42 — lista abaixo do mapa: os mesmos PAP que estão no mapa
  // (respeita o filtro "PAP ativos agora"), confirmados primeiro, depois
  // por cidade e nome. Sem texto na busca, mostra todos.
  const itens = useMemo<ItemBusca[]>(() => {
    const confirmados = pontosApoioVisiveis.map((p) => ({
      chave: `pap:${p.id}`,
      nome: p.nome,
      cidade: p.cidade ?? "",
      km: p.km_referencia,
      sentido: p.sentido_pista,
      confirmado: true,
      ativoHoje: papAtivoAgora(p),
    }));
    const pre = papsPreCadastroVisiveis.map((p) => ({
      chave: `pre:${p.id}`,
      nome: p.nome,
      cidade: p.cidade,
      km: p.km,
      sentido: p.sentido_pista,
      confirmado: false,
      ativoHoje: preCadastroAtivoAgora(p),
    }));
    const porCidadeENome = (a: ItemBusca, b: ItemBusca) =>
      a.cidade.localeCompare(b.cidade, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR");
    return [...confirmados.sort(porCidadeENome), ...pre.sort(porCidadeENome)];
  }, [pontosApoioVisiveis, papsPreCadastroVisiveis]);

  const resultados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return itens;
    return itens.filter((i) => normalizar(i.nome).includes(termo) || normalizar(i.cidade).includes(termo));
  }, [itens, busca]);

  function mostrarNoMapa(chave: string) {
    setFoco((atual) => ({ chave, seq: (atual?.seq ?? 0) + 1 }));
    mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={somenteAtivos}
            onChange={(e) => setSomenteAtivos(e.target.checked)}
          />
          <Tent size={16} className="text-green-600" /> PAP ativos agora
        </label>
      </div>

      {(papsPreCadastro.length > 0 || pontosApoio.length > 0) && (
        <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden="true" />
            Confirmado / vinculado a um gerente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-neutral-400 bg-neutral-400" aria-hidden="true" />
            Aguardando vínculo (localização estimada pelo km)
          </span>
        </div>
      )}
      {isAdmin && papsPreCadastro.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          Como administrador, você pode arrastar qualquer marcador cinza tracejado para ajustar a posição exata do PAP.
        </p>
      )}

      {/* Rodada 42 — pedido do usuário: instrução explícita de como ver
          as informações de cada PAP. */}
      <p
        className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 dark:bg-green-950/40 dark:text-green-300"
        style={{ textAlign: "left" }}
      >
        <MousePointerClick size={18} className="shrink-0" />
        Clique em cima do PAP desejado para ver as informações.
      </p>

      <div ref={mapaRef} className="scroll-mt-20">
        <MapView
          pontosApoio={pontosApoioVisiveis}
          papsPreCadastro={papsPreCadastroVisiveis}
          height="65vh"
          permitirArrastarPapPreCadastro={isAdmin}
          papDestacado
          focoPap={foco}
        />
      </div>

      {/* Rodada 42 — busca de PAP por nome ou cidade; tocar num resultado
          leva o mapa até ele e abre as informações. */}
      <section className="card mt-2">
        <h2 className="mb-2 text-base font-bold">Buscar PAP por nome ou cidade</h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input
            type="search"
            className="input input-com-icone"
            placeholder="Ex.: Taubaté, Terço dos Homens..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setLimite(LIMITE_INICIAL);
            }}
          />
        </div>
        <p className="mb-2 text-xs text-neutral-500">
          {busca.trim()
            ? `${resultados.length} PAP encontrado${resultados.length === 1 ? "" : "s"}`
            : `Todos os ${resultados.length} PAP${somenteAtivos ? " ativos agora" : ""}`}{" "}
          — toque em um para ver no mapa.
        </p>
        {resultados.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500" style={{ textAlign: "center" }}>
            Nenhum PAP encontrado com esse nome ou cidade.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {resultados.slice(0, limite).map((i) => (
              <li key={i.chave}>
                <button
                  type="button"
                  onClick={() => mostrarNoMapa(i.chave)}
                  className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-neutral-800/60"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${
                      i.confirmado ? "bg-green-600" : "border border-dashed border-neutral-500 bg-neutral-400"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{i.nome}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      {i.cidade}
                      {i.km != null ? ` — km ${i.km}${i.sentido && SENTIDO_KM_ABREV[i.sentido] ? ` ${SENTIDO_KM_ABREV[i.sentido]}` : ""}` : ""}
                      {!i.confirmado ? " — aguardando vínculo" : ""}
                    </span>
                  </span>
                  {i.ativoHoje && (
                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-300">
                      ativo hoje
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {resultados.length > limite && (
          <button
            type="button"
            onClick={() => setLimite((l) => l + LIMITE_INICIAL)}
            className="btn-secondary mt-3 w-full"
          >
            Mostrar mais ({resultados.length - limite} restantes)
          </button>
        )}
      </section>
    </div>
  );
}
