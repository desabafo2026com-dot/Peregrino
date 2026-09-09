"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, MapPin, CheckCircle2, Radio, Award, Footprints, Bike, Route as RouteIcon } from "lucide-react";
import { MEIO_TRANSPORTE_OPTIONS, MEIO_TRANSPORTE_LABELS } from "@/lib/constants";
import AlertaProximidade from "@/components/AlertaProximidade";
import type { Peregrinacao, PontoApoio, PontoCheckin, Profile, Rota, MeioTransporte } from "@/types/database";

interface Props {
  perfil: Profile;
  peregrinacaoInicial: Peregrinacao | null;
  pontosApoio: PontoApoio[];
  rotas: Rota[];
  checkinsCount: number;
  pontosCheckin: PontoCheckin[];
  checkinsFeitosIds: string[];
}

function formatarDuracao(inicio: string | null, fim: Date) {
  if (!inicio) return null;
  const duracao = intervalToDuration({ start: new Date(inicio), end: fim });
  const texto = formatDuration(duracao, {
    format: ["days", "hours", "minutes"],
    locale: ptBR,
    zero: false,
  });
  return texto || "menos de 1 minuto";
}

function gerarCodigoCertificado() {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36);
  return "PGR-" + raw.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function obterPosicaoAtual(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function PeregrinacaoClient({
  perfil,
  peregrinacaoInicial,
  pontosApoio,
  rotas,
  checkinsCount: checkinsCountInicial,
  pontosCheckin,
  checkinsFeitosIds: checkinsFeitosIdsInicial,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [peregrinacao, setPeregrinacao] = useState(peregrinacaoInicial);
  const [checkinsCount, setCheckinsCount] = useState(checkinsCountInicial);
  const [checkinsFeitosIds, setCheckinsFeitosIds] = useState(checkinsFeitosIdsInicial);
  const [diasPrevistos, setDiasPrevistos] = useState("3");
  const [dataInicioPrevista, setDataInicioPrevista] = useState("");
  const [meioTransporte, setMeioTransporte] = useState<MeioTransporte>("a_pe");
  const [rotaId, setRotaId] = useState(rotas[0]?.id ?? "");
  const [emGrupo, setEmGrupo] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [compartilhando, setCompartilhando] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function criarPeregrinacao(iniciarAgora: boolean) {
    setErro(null);
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from("peregrinacoes")
      .insert({
        user_id: user!.id,
        status: iniciarAgora ? "em_andamento" : "planejada",
        dias_previstos: diasPrevistos ? Number(diasPrevistos) : null,
        data_inicio_prevista: dataInicioPrevista || null,
        data_inicio: iniciarAgora ? agora : null,
        meio_transporte: meioTransporte,
        rota_id: rotaId || null,
        em_grupo: emGrupo,
        nome_grupo: emGrupo ? nomeGrupo || null : null,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      setErro(error.message);
      return;
    }

    const novaPeregrinacao = data as Peregrinacao;

    if (iniciarAgora && rotaId) {
      // O início da peregrinação já conta como o primeiro check-in.
      const primeiroPonto = pontosCheckin.find((p) => p.rota_id === rotaId && p.ordem === 1);
      if (primeiroPonto) {
        const pos = await obterPosicaoAtual();
        await supabase.from("checkins").insert({
          peregrinacao_id: novaPeregrinacao.id,
          user_id: user!.id,
          ponto_checkin_id: primeiroPonto.id,
          latitude: pos?.coords.latitude ?? primeiroPonto.latitude,
          longitude: pos?.coords.longitude ?? primeiroPonto.longitude,
        });
      }
      setLoading(false);
      router.push("/peregrinacao/trajeto");
      return;
    }

    setLoading(false);
    setPeregrinacao(novaPeregrinacao);
  }

  async function iniciarCaminhada() {
    if (!peregrinacao) return;
    setLoading(true);
    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from("peregrinacoes")
      .update({ status: "em_andamento", data_inicio: agora })
      .eq("id", peregrinacao.id)
      .select()
      .single();

    if (error) {
      setLoading(false);
      setErro(error.message);
      return;
    }

    const atualizada = data as Peregrinacao;

    if (atualizada.rota_id) {
      const primeiroPonto = pontosCheckin.find(
        (p) => p.rota_id === atualizada.rota_id && p.ordem === 1
      );
      if (primeiroPonto && !checkinsFeitosIds.includes(primeiroPonto.id)) {
        const pos = await obterPosicaoAtual();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from("checkins").insert({
          peregrinacao_id: atualizada.id,
          user_id: user!.id,
          ponto_checkin_id: primeiroPonto.id,
          latitude: pos?.coords.latitude ?? primeiroPonto.latitude,
          longitude: pos?.coords.longitude ?? primeiroPonto.longitude,
        });
      }
    }

    setLoading(false);
    router.push("/peregrinacao/trajeto");
  }

  function iniciarCompartilhamento() {
    if (!peregrinacao) return;
    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }
    setErro(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase.from("localizacoes_ativas").upsert({
          peregrinacao_id: peregrinacao.id,
          user_id: peregrinacao.user_id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao_m: pos.coords.accuracy,
          atualizado_em: new Date().toISOString(),
        });
      },
      () => setErro("Não foi possível acessar sua localização. Verifique as permissões."),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    setCompartilhando(true);
    supabase
      .from("peregrinacoes")
      .update({ compartilhar_localizacao: true })
      .eq("id", peregrinacao.id)
      .then(() => {});
  }

  async function pararCompartilhamento() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCompartilhando(false);
    if (peregrinacao) {
      await supabase.from("localizacoes_ativas").delete().eq("peregrinacao_id", peregrinacao.id);
      await supabase
        .from("peregrinacoes")
        .update({ compartilhar_localizacao: false })
        .eq("id", peregrinacao.id);
    }
  }

  async function fazerCheckin(pontoCheckinId?: string) {
    if (!peregrinacao) return;
    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }
    setErro(null);
    setMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.from("checkins").insert({
          peregrinacao_id: peregrinacao.id,
          user_id: peregrinacao.user_id,
          ponto_apoio_id: pontoSelecionado || null,
          ponto_checkin_id: pontoCheckinId || null,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (error) {
          setErro(error.message);
          return;
        }
        setCheckinsCount((c) => c + 1);
        if (pontoCheckinId) {
          setCheckinsFeitosIds((ids) => [...ids, pontoCheckinId]);
        }
        setMsg("Check-in registrado com sucesso!");
      },
      () => setErro("Não foi possível acessar sua localização para o check-in.")
    );
  }

  async function finalizarPeregrinacao() {
    if (!peregrinacao) return;
    if (!confirm("Finalizar a peregrinação e gerar seu certificado?")) return;

    setLoading(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await supabase.from("localizacoes_ativas").delete().eq("peregrinacao_id", peregrinacao.id);

    const agora = new Date();
    const inicio = peregrinacao.data_inicio ? new Date(peregrinacao.data_inicio) : agora;
    const diasCaminhada = Math.max(
      1,
      Math.ceil((agora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) || 1
    );
    const duracaoTexto = formatarDuracao(peregrinacao.data_inicio, agora);
    const rotaAtual = rotas.find((r) => r.id === peregrinacao.rota_id);
    const meioAtual = peregrinacao.meio_transporte ?? "a_pe";

    const { error: updateError } = await supabase
      .from("peregrinacoes")
      .update({ status: "concluida", data_fim: agora.toISOString() })
      .eq("id", peregrinacao.id);

    if (updateError) {
      setLoading(false);
      setErro(updateError.message);
      return;
    }

    const { error: certError } = await supabase.from("certificados").insert({
      peregrinacao_id: peregrinacao.id,
      user_id: peregrinacao.user_id,
      codigo: gerarCodigoCertificado(),
      nome_peregrino: perfil.nome_completo,
      dias_caminhada: diasCaminhada,
      data_inicio: peregrinacao.data_inicio,
      data_fim: agora.toISOString(),
      total_checkins: checkinsCount,
      rota_nome: rotaAtual ? `${rotaAtual.nome} (${rotaAtual.origem} → ${rotaAtual.destino})` : null,
      meio_transporte: meioAtual,
      duracao_texto: duracaoTexto,
    });

    setLoading(false);
    if (certError) {
      setErro(certError.message);
      return;
    }
    router.push("/certificado");
  }

  if (!perfil.aceita_compartilhar_localizacao) {
    // não bloqueia o fluxo, apenas avisa — mostrado dentro das seções relevantes
  }

  if (!peregrinacao) {
    return (
      <div className="card">
        <h2 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
          Planeje sua peregrinação
        </h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Dias previstos de caminhada</label>
            <input
              type="number"
              min={1}
              className="input"
              value={diasPrevistos}
              onChange={(e) => setDiasPrevistos(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data prevista de início</label>
            <input
              type="date"
              className="input"
              value={dataInicioPrevista}
              onChange={(e) => setDataInicioPrevista(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Meio de transporte</label>
            <select
              className="input"
              value={meioTransporte}
              onChange={(e) => setMeioTransporte(e.target.value as MeioTransporte)}
            >
              {MEIO_TRANSPORTE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {rotas.length > 0 && (
            <div>
              <label className="label">Rota</label>
              <select className="input" value={rotaId} onChange={(e) => setRotaId(e.target.value)}>
                {rotas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} ({r.origem} → {r.destino})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="emgrupo"
              type="checkbox"
              className="h-4 w-4"
              checked={emGrupo}
              onChange={(e) => setEmGrupo(e.target.checked)}
            />
            <label htmlFor="emgrupo" className="text-sm font-medium">
              Vou em grupo nesta peregrinação
            </label>
          </div>
          {emGrupo && (
            <div>
              <label className="label">Nome do grupo</label>
              <input
                className="input"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                placeholder="Ex: Grupo Nossa Senhora Aparecida"
              />
            </div>
          )}
        </div>
        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        <div className="flex flex-wrap gap-3">
          <button disabled={loading} onClick={() => criarPeregrinacao(false)} className="btn-secondary">
            Salvar plano
          </button>
          <button disabled={loading} onClick={() => criarPeregrinacao(true)} className="btn-primary flex items-center gap-2">
            <Flag size={18} /> Iniciar peregrinação agora
          </button>
        </div>
      </div>
    );
  }

  if (peregrinacao.status === "planejada") {
    const rotaPlanejada = rotas.find((r) => r.id === peregrinacao.rota_id);
    return (
      <div className="card">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-500">
          {peregrinacao.meio_transporte === "bicicleta" ? <Bike size={16} /> : <Footprints size={16} />}
          {MEIO_TRANSPORTE_LABELS[peregrinacao.meio_transporte] ?? "a pé"}
          {rotaPlanejada ? ` — ${rotaPlanejada.nome} (${rotaPlanejada.origem} → ${rotaPlanejada.destino})` : ""}
          {peregrinacao.em_grupo ? ` — em grupo${peregrinacao.nome_grupo ? ` (${peregrinacao.nome_grupo})` : ""}` : ""}
        </p>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
          Peregrinação planejada
          {peregrinacao.data_inicio_prevista
            ? ` para ${new Date(peregrinacao.data_inicio_prevista).toLocaleDateString("pt-BR")}`
            : ""}
          {peregrinacao.dias_previstos ? ` — ${peregrinacao.dias_previstos} dia(s) previstos.` : "."}
        </p>
        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        <button disabled={loading} onClick={iniciarCaminhada} className="btn-primary flex items-center gap-2">
          <Flag size={18} /> Iniciar caminhada
        </button>
      </div>
    );
  }

  if (peregrinacao.status === "em_andamento") {
    const rotaAtiva = rotas.find((r) => r.id === peregrinacao.rota_id);
    return (
      <div className="flex flex-col gap-5">
        <div className="card border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-green-800 dark:text-green-400">
                <Radio size={18} /> Peregrinação em andamento
              </p>
              <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                {peregrinacao.meio_transporte === "bicicleta" ? <Bike size={14} /> : <Footprints size={14} />}
                {MEIO_TRANSPORTE_LABELS[peregrinacao.meio_transporte] ?? "a pé"}
                {rotaAtiva ? ` — ${rotaAtiva.nome} (${rotaAtiva.origem} → ${rotaAtiva.destino})` : ""}
                {peregrinacao.em_grupo
                  ? ` — em grupo${peregrinacao.nome_grupo ? ` (${peregrinacao.nome_grupo})` : ""}`
                  : ""}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Iniciada em{" "}
                {peregrinacao.data_inicio
                  ? new Date(peregrinacao.data_inicio).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </div>
            {pontosCheckin.length > 0 && (
              <AlertaProximidade
                pontosCheckin={pontosCheckin}
                checkinsFeitosIds={checkinsFeitosIds}
                onCheckin={(ponto) => fazerCheckin(ponto.id)}
              />
            )}
          </div>
        </div>

        {pontosCheckin.length > 0 && (
          <Link
            href="/peregrinacao/trajeto"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <RouteIcon size={18} /> Ver trajeto e pontos de check-in
          </Link>
        )}

        <div className="card">
          <h2 className="mb-2 text-base font-bold text-amber-800 dark:text-amber-500">
            Compartilhar localização
          </h2>
          {!perfil.aceita_compartilhar_localizacao ? (
            <p className="text-sm text-neutral-500">
              Você não autorizou o compartilhamento de localização no seu
              perfil. Ative essa opção em &quot;Perfil&quot; para usar este
              recurso.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
                {compartilhando
                  ? "Sua localização está sendo compartilhada com a equipe de apoio."
                  : "Ative para que a equipe de apoio possa avisar sobre condições adversas e te localizar em caso de emergência. Outros peregrinos não veem sua localização."}
              </p>
              {!compartilhando ? (
                <button onClick={iniciarCompartilhamento} className="btn-primary flex items-center gap-2">
                  <MapPin size={18} /> Começar a compartilhar
                </button>
              ) : (
                <button onClick={pararCompartilhamento} className="btn-secondary flex items-center gap-2">
                  Parar de compartilhar
                </button>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 text-base font-bold text-amber-800 dark:text-amber-500">
            Check-in ({checkinsCount})
          </h2>
          <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
            Confirme sua passagem para ajudar na localização de peregrinos.
          </p>
          <select
            className="input mb-3"
            value={pontoSelecionado}
            onChange={(e) => setPontoSelecionado(e.target.value)}
          >
            <option value="">Check-in livre (sem ponto de apoio)</option>
            {pontosApoio.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button onClick={() => fazerCheckin()} className="btn-primary flex items-center gap-2">
            <CheckCircle2 size={18} /> Fazer check-in aqui
          </button>
          {msg && <p className="mt-2 text-sm text-green-700">{msg}</p>}
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="card">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
            <Award size={18} /> Concluir
          </h2>
          <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
            Ao finalizar, seu certificado de peregrino será gerado automaticamente.
          </p>
          <button disabled={loading} onClick={finalizarPeregrinacao} className="btn-primary">
            {loading ? "Finalizando..." : "Finalizar peregrinação"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card text-center">
      <p className="mb-3 text-neutral-600 dark:text-neutral-300">
        Sua última peregrinação já foi concluída. 🎉
      </p>
      <a href="/certificado" className="btn-primary inline-block">
        Ver certificado
      </a>
    </div>
  );
}
