"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Circle, TriangleAlert, Megaphone, ThumbsUp, Ban } from "lucide-react";
import { NIVEL_RISCO_LABELS, SENTIDO_KM_ABREV, CATEGORIA_SINISTRO_LABELS } from "@/lib/constants";
import { cidadeDoCaminhoProxima } from "@/lib/checkin-cidade";
import { votarAviso, LIMITE_NAO_EXISTE, type TipoVotoAviso } from "@/lib/avisos-votos";
import InformarSinistro from "@/components/InformarSinistro";
import { KM_DUTRA_APARECIDA, kmDutraEntrada, kmFaltamAparecida, kmReferenciaAtual, riscoAindaAFrente } from "@/lib/km-dutra";
import type { Peregrinacao, PontoCheckin, PontoRisco, RiscoInformado, Rota } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  peregrinacao: Peregrinacao;
  pontosCheckin: PontoCheckin[];
  checkinsFeitosIdsIniciais: string[];
  riscos: PontoRisco[];
  avisos: RiscoInformado[];
  rota: Rota | null;
}

function tempoDesde(iso: string) {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.round(minutos / 60)}h`;
}

// Só existem 3 níveis (Moderado/Alto/Muito alto) — ver NIVEL_RISCO_LABELS.
function riscoColor(nivel: number) {
  return nivel >= 4 ? "text-red-600" : "text-amber-600";
}

function kmSentidoLabel(km: number | null, sentido: string | null) {
  if (km == null) return "—";
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

export default function TrajetoClient({
  peregrinacao,
  pontosCheckin,
  checkinsFeitosIdsIniciais,
  riscos,
  avisos,
  rota,
}: Props) {
  const supabase = createClient();
  const [checkinsFeitos, setCheckinsFeitos] = useState(new Set(checkinsFeitosIdsIniciais));
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [listaAvisos, setListaAvisos] = useState(avisos);
  const [minhaPosicao, setMinhaPosicao] = useState<{ lat: number; lng: number } | null>(null);

  // Mostra a posição atual do peregrino no mapa do trajeto.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMinhaPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Rodada 48 — os check-ins das cidades do meio são automáticos
  // (Migration 42); este botão faz o mesmo na hora, com a mesma regra
  // (cidade do caminho mais próxima, até 8 km, fora a de início e
  // Aparecida). A lista é atualizada a cada 30 segundos.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("ponto_checkin_id")
        .eq("peregrinacao_id", peregrinacao.id)
        .not("ponto_checkin_id", "is", null)
        .order("criado_em", { ascending: true });
      if (error || !data) return;
      const ids = data.map((c) => c.ponto_checkin_id as string);
      setCheckinsFeitos((prev) => {
        if (ids.every((id) => prev.has(id))) return prev;
        const proximo = new Set(prev);
        ids.forEach((id) => proximo.add(id));
        return proximo;
      });
    }, 30000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peregrinacao.id]);

  async function fazerCheckin() {
    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }
    setErro(null);
    setMsg(null);
    setCarregando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ponto = cidadeDoCaminhoProxima(pos.coords.latitude, pos.coords.longitude, pontosCheckin);
        if (!ponto) {
          setCarregando(false);
          setMsg(
            "Você não está perto de uma cidade do caminho agora. A cidade de início já tem check-in e o de Aparecida é feito ao finalizar, em Minha peregrinação."
          );
          return;
        }
        if (checkinsFeitos.has(ponto.id)) {
          setCarregando(false);
          setMsg(`Você está em ${ponto.cidade}, e o check-in desta cidade já foi feito.`);
          return;
        }
        const { error } = await supabase.from("checkins").insert({
          peregrinacao_id: peregrinacao.id,
          user_id: peregrinacao.user_id,
          ponto_checkin_id: ponto.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setCarregando(false);
        if (error) {
          setErro(error.message);
          return;
        }
        setCheckinsFeitos((prev) => new Set(prev).add(ponto.id));
        setMsg(`Check-in em ${ponto.cidade} registrado com sucesso!`);
      },
      () => {
        setCarregando(false);
        setErro("Não foi possível acessar sua localização.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const concluidos = pontosCheckin.filter((p) => checkinsFeitos.has(p.id)).length;

  // Fallback (cidade sem km da Dutra conhecido): distância que falta pelo
  // km_aproximado já cadastrado (acumulado desde a origem da rota) — o
  // maior valor da lista é o próprio ponto de Aparecida.
  const kmAparecida = pontosCheckin.reduce(
    (max, p) => (p.km_aproximado != null && p.km_aproximado > max ? p.km_aproximado : max),
    -Infinity
  );
  const temKmAparecida = kmAparecida !== -Infinity;

  // Rodada 46 — só os pontos de risco que ainda faltam até Aparecida (do
  // km da entrada da cidade do último check-in, ou da cidade de início, em
  // diante), dentro da rota do peregrino.
  const kmAtual = kmReferenciaAtual(rota?.slug, pontosCheckin, Array.from(checkinsFeitos));
  const riscosAFrente = riscos.filter((r) => riscoAindaAFrente(r, rota?.slug, kmAtual));

  // Mesma ordem de leitura usada em /rotas: sentido Norte (km decrescente),
  // sentido Sul (km crescente) — sem km cadastrado, fica por último.
  const riscosOrdenados = [...riscosAFrente].sort((a, b) => {
    if (a.km_referencia == null) return 1;
    if (b.km_referencia == null) return -1;
    return rota?.slug === "sul" ? a.km_referencia - b.km_referencia : b.km_referencia - a.km_referencia;
  });

  // Os já feitos ganham no mapa o número da sequência em que foram feitos
  // (o Set guarda a ordem de inserção: primeiro os que vieram do servidor,
  // em ordem de horário, depois os feitos nesta tela).
  const sequencia = new Map(Array.from(checkinsFeitos).map((id, i) => [id, i + 1]));
  const trajeto = pontosCheckin.map((p) => ({
    ordem: p.ordem,
    cidade: p.cidade,
    lat: p.latitude,
    lng: p.longitude,
    feito: checkinsFeitos.has(p.id),
    sequencia: sequencia.get(p.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <InformarSinistro rotaId={peregrinacao.rota_id} destaque />

      {listaAvisos.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-orange-600">
            <Megaphone size={20} /> Avisos recentes de peregrinos
          </h2>
          <p className="mb-3 text-xs text-neutral-500" style={{ textAlign: "left" }}>
            Passou por algum? Confirme se ainda está lá ou informe que já
            não existe — com {LIMITE_NAO_EXISTE} respostas de &quot;já não existe&quot; o aviso sai.
          </p>
          <div className="flex flex-col gap-2">
            {listaAvisos.map((a) => (
              <AvisoCard
                key={a.id}
                aviso={a}
                onRemovido={() => setListaAvisos((l) => l.filter((x) => x.id !== a.id))}
              />
            ))}
          </div>
        </section>
      )}

      {pontosCheckin.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
            Mapa do trajeto
          </h2>
          <MapView
            trajeto={trajeto}
            minhaPosicao={minhaPosicao}
            center={[pontosCheckin[0].longitude, pontosCheckin[0].latitude]}
            zoom={7}
            height="350px"
          />
        </section>
      )}

      {rota && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-amber-800 dark:text-amber-500">
            <span>Progresso</span>
            <span>
              {concluidos} / {pontosCheckin.length} cidades
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-amber-700"
              style={{
                width: `${pontosCheckin.length ? (concluidos / pontosCheckin.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-amber-800 dark:text-amber-500">
          Pontos de check-in por cidade
        </h2>
        <p className="mb-2 text-xs text-neutral-500" style={{ textAlign: "left" }}>
          O check-in da cidade de início é feito ao iniciar a caminhada, e o
          de Aparecida ao finalizar. Os das cidades do caminho são
          automáticos com a localização compartilhada e o app aberto.
        </p>
        <button
          onClick={fazerCheckin}
          disabled={carregando}
          className="btn-secondary mb-3 flex w-full items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          {carregando ? "Registrando..." : "Registrar agora a cidade onde estou"}
        </button>
        {msg && <p className="mb-3 text-center text-sm text-green-700">{msg}</p>}
        <div className="flex flex-col gap-2">
          {pontosCheckin.map((p) => {
            const feito = checkinsFeitos.has(p.id);
            return (
              <div
                key={p.id}
                className={`card flex items-center gap-3 ${
                  feito ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {feito ? (
                    <CheckCircle2 className="text-green-600" size={22} />
                  ) : (
                    <Circle className="text-neutral-300" size={22} />
                  )}
                  <div>
                    <p className="font-semibold">{p.cidade}</p>
                    <KmCidade
                      cidade={p.cidade}
                      rotaSlug={rota?.slug}
                      kmAproximado={p.km_aproximado}
                      kmAparecidaFallback={temKmAparecida ? kmAparecida : null}
                    />
                    {p.descricao && <p className="text-xs text-neutral-500">{p.descricao}</p>}
                  </div>
                </div>

              </div>
            );
          })}
          {pontosCheckin.length === 0 && (
            <p className="text-sm text-neutral-400">
              Nenhum ponto de check-in cadastrado para esta rota ainda.
            </p>
          )}
        </div>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-red-700">
          <TriangleAlert size={20} /> Pontos de risco que faltam até Aparecida
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Só os que ainda estão à sua frente na rota, a partir da cidade do seu
          último check-in. Toque na foto para ampliar.
        </p>
        {riscosOrdenados.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Nenhum ponto de risco cadastrado à sua frente até Aparecida.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {riscosOrdenados.map((r) => (
              <div key={r.id} className="card flex gap-3 border-red-100 p-3 dark:border-red-950">
                {r.foto_url ? (
                  <a href={r.foto_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.foto_url}
                      alt={`Foto de ${r.titulo}`}
                      loading="lazy"
                      className="rounded-lg object-cover"
                      style={{ width: 64, height: 64 }}
                    />
                  </a>
                ) : (
                  <div
                    className="flex shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-300 dark:bg-red-950/40"
                    style={{ width: 64, height: 64 }}
                  >
                    <TriangleAlert size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight" style={{ textAlign: "left" }}>{r.titulo}</p>
                  <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
                    {kmSentidoLabel(r.km_referencia, r.sentido)}
                    {r.km_referencia != null && ` — faltam ≈ ${kmFaltamAparecida(r.km_referencia)} km até Aparecida`}
                  </p>
                  <p className={`text-xs font-semibold ${riscoColor(r.nivel_risco)}`}>
                    Risco {NIVEL_RISCO_LABELS[r.nivel_risco]?.toLowerCase()}
                  </p>
                  {r.descricao && (
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
                      {r.descricao}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Rodada 46 — em vez do "km X da rota" (distância desde a origem, que não
// bate com nenhuma placa), mostra o km real da Dutra na entrada da cidade
// e quantos km faltam dali até Aparecida. Sem km da Dutra conhecido para a
// cidade, volta ao cálculo antigo só para o "faltam".
function KmCidade({
  cidade,
  rotaSlug,
  kmAproximado,
  kmAparecidaFallback,
}: {
  cidade: string;
  rotaSlug: string | null | undefined;
  kmAproximado: number | null;
  kmAparecidaFallback: number | null;
}) {
  const kmEntrada = kmDutraEntrada(rotaSlug, cidade);
  const ehAparecida = cidade.trim().toLowerCase() === "aparecida";
  if (ehAparecida) {
    return (
      <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
        ≈ km {kmEntrada ?? KM_DUTRA_APARECIDA} da Dutra — chegada à Basílica
      </p>
    );
  }
  if (kmEntrada != null) {
    return (
      <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Entrada da cidade ≈ km {kmEntrada} da Dutra — faltam ≈ {kmFaltamAparecida(kmEntrada)} km até Aparecida
      </p>
    );
  }
  if (kmAproximado != null && kmAparecidaFallback != null && kmAproximado < kmAparecidaFallback) {
    return (
      <p className="text-xs text-neutral-500" style={{ textAlign: "left" }}>
        Faltam ≈ {Math.round(kmAparecidaFallback - kmAproximado)} km até Aparecida
      </p>
    );
  }
  return null;
}

// Rodada 47 — aviso com os botões "Ainda está lá" / "Já não existe" e o
// mostrador de confirmações de outros peregrinos.
function AvisoCard({ aviso, onRemovido }: { aviso: RiscoInformado; onRemovido: () => void }) {
  const [confirmacoes, setConfirmacoes] = useState(aviso.confirmacoes ?? 0);
  const [enviando, setEnviando] = useState(false);
  const [retorno, setRetorno] = useState<{ ok: boolean; texto: string } | null>(null);

  async function votar(tipo: TipoVotoAviso) {
    setEnviando(true);
    setRetorno(null);
    const r = await votarAviso(aviso.id, tipo);
    setEnviando(false);
    if ("erro" in r) {
      setRetorno({ ok: false, texto: r.erro });
      return;
    }
    setConfirmacoes(r.confirmacoes);
    if (r.removido) {
      setRetorno({ ok: true, texto: `Obrigado! ${LIMITE_NAO_EXISTE} peregrinos informaram que já não existe — o aviso saiu.` });
      window.setTimeout(onRemovido, 2500);
      return;
    }
    setRetorno({
      ok: true,
      texto: r.ja_tinha_votado
        ? "Você já tinha respondido este aviso."
        : tipo === "confirma"
          ? "Obrigado por confirmar!"
          : `Obrigado! Já não existe: ${r.nao_existe} de ${LIMITE_NAO_EXISTE} para o aviso sair.`,
    });
  }

  return (
    <div className="card border-orange-200 dark:border-orange-900">
      {confirmacoes > 0 && (
        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 dark:bg-green-950 dark:text-green-300">
          <ThumbsUp size={12} /> {confirmacoes === 1 ? "Confirmado por 1 peregrino" : `Confirmado por ${confirmacoes} peregrinos`}
        </span>
      )}
      <p className="flex items-center justify-between gap-2 font-semibold text-orange-700" style={{ textAlign: "left" }}>
        <span>
          {CATEGORIA_SINISTRO_LABELS[aviso.categoria] ?? aviso.categoria} — {aviso.titulo}
        </span>
        <span className="whitespace-nowrap text-xs font-medium">
          {aviso.status === "aprovado" ? "Confirmado pela adm." : "Não confirmado pela adm."}
        </span>
      </p>
      {aviso.descricao && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
          {aviso.descricao}
        </p>
      )}
      <p className="text-xs text-neutral-500">Informado {tempoDesde(aviso.criado_em)}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={enviando}
          onClick={() => votar("confirma")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-2 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          <ThumbsUp size={14} /> Ainda está lá
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => votar("nao_existe")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Ban size={14} /> Já não existe
        </button>
      </div>
      {retorno && (
        <p className={`mt-1 text-xs ${retorno.ok ? "text-green-700" : "text-red-600"}`}>{retorno.texto}</p>
      )}
    </div>
  );
}
