"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Flag,
  MapPin,
  MapPinned,
  CheckCircle2,
  Radio,
  Award,
  Footprints,
  Bike,
  RotateCcw,
  Trash2,
  LocateFixed,
  Sparkles,
  Tent,
  Megaphone,
} from "lucide-react";
import { MEIO_TRANSPORTE_OPTIONS, MEIO_TRANSPORTE_LABELS, MOTIVOS, DIAS_PREVISTOS_OPTIONS, nomeRota } from "@/lib/constants";
import AlertaProximidade from "@/components/AlertaProximidade";
import InformarSinistro from "@/components/InformarSinistro";
import TrajetoTimelineCompact from "@/components/TrajetoTimelineCompact";
import { cidadeMaisProxima } from "@/lib/checkin-cidade";
import { votarAviso } from "@/lib/avisos-votos";
import type { PapPreCadastroMapa, PontoTrajeto } from "@/components/MapView";
import type {
  Peregrinacao,
  PontoApoio,
  PontoCheckin,
  RiscoInformado,
  Profile,
  Rota,
  MeioTransporte,
  Motivo,
} from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

// Listas vazias fixas para as camadas desligadas do mapa — um `[]` novo a
// cada render faria o mapa apagar e recriar todos os marcadores (fechando
// qualquer balão aberto) toda vez que a posição do GPS atualiza.
const SEM_PAP: PontoApoio[] = [];
const SEM_PRE: PapPreCadastroMapa[] = [];
const SEM_AVISO: RiscoInformado[] = [];

// Coordenadas aproximadas da Basílica de Nossa Senhora Aparecida — usadas
// como referência para confirmar, por geolocalização, que o peregrino está
// mesmo em Aparecida ao finalizar a peregrinação (fallback caso a rota não
// tenha um ponto de check-in cadastrado em Aparecida).
const APARECIDA_LAT = -22.8494;
const APARECIDA_LNG = -45.2317;
const DISTANCIA_AVISO_KM = 5;


function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface PeregrinacaoConcluida extends Peregrinacao {
  temCertificado: boolean;
  certificadoId: string | null;
  plusPago: boolean;
}

interface Props {
  perfil: Profile;
  peregrinacaoInicial: Peregrinacao | null;
  peregrinacoesConcluidas: PeregrinacaoConcluida[];
  pontosApoio: PontoApoio[];
  // Rodada 46 — PAP do pré-cadastro (ainda sem gerente) ativos hoje, já
  // posicionados no servidor, para o mapa mostrar todos os PAP ativos.
  papsPreCadastro: PapPreCadastroMapa[];
  avisos: RiscoInformado[];
  rotas: Rota[];
  checkinsCount: number;
  pontosCheckin: PontoCheckin[];
  todosPontosCheckin: PontoCheckin[];
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

function labelMeioTransporte(meio: MeioTransporte | null | undefined, outroDesc?: string | null) {
  if (meio === "outros") return outroDesc || "outro meio de transporte";
  return meio ? (MEIO_TRANSPORTE_LABELS[meio] ?? "a pé") : "a pé";
}

function gerarCodigoCertificado() {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36);
  return "PGR-" + raw.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// Contador de tempo total decorrido desde o início da peregrinação —
// atualiza a cada segundo (Rodada 47: passou a mostrar os segundos) com
// dias/horas/minutos/segundos de caminhada
// em andamento, em destaque (maior e com hora:minuto sempre visíveis,
// mesmo quando zerados) — item pedido pelo usuário.
function ContadorTempoTotal({ dataInicio }: { dataInicio: string | null }) {
  // Começa vazio e só passa a contar no navegador: com os segundos na
  // tela, a hora calculada no servidor nunca bate com a do aparelho, e o
  // React reclamaria da diferença ao montar a página.
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    const primeiro = setTimeout(() => setAgora(new Date()), 0);
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => {
      clearTimeout(primeiro);
      clearInterval(id);
    };
  }, []);

  if (!dataInicio) return null;
  const duracao = intervalToDuration({ start: new Date(dataInicio), end: agora ?? new Date(dataInicio) });
  const dias = duracao.days ?? 0;
  const horas = duracao.hours ?? 0;
  const minutos = duracao.minutes ?? 0;
  const segundos = duracao.seconds ?? 0;

  return (
    <div className="mx-auto my-2 flex w-full max-w-[300px] flex-col items-center rounded-2xl bg-green-600 px-6 py-4 text-white shadow-sm dark:bg-green-700">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-green-100 uppercase">
        <Radio size={13} /> Tempo de caminhada
      </p>
      <div className="mt-1 flex items-end gap-4" style={{ visibility: agora ? "visible" : "hidden" }}>
        {dias > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-4xl leading-none font-black tabular-nums">{dias}</span>
            <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-green-100 uppercase">
              {dias === 1 ? "dia" : "dias"}
            </span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-4xl leading-none font-black tabular-nums">
            {String(horas).padStart(2, "0")}
            <span className="text-green-200">:</span>
            {String(minutos).padStart(2, "0")}
            <span className="text-green-200">:</span>
            {String(segundos).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-green-100 uppercase">
            horas : min : seg
          </span>
        </div>
      </div>
    </div>
  );
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
  peregrinacoesConcluidas,
  pontosApoio,
  papsPreCadastro,
  avisos,
  rotas,
  checkinsCount: checkinsCountInicial,
  pontosCheckin,
  todosPontosCheckin,
  checkinsFeitosIds: checkinsFeitosIdsInicial,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  // Filtros do mapa de "Minha peregrinação" (Rodada 20) — vêm ativos por
  // padrão, com opção de desativar cada camada. Rodada 47: o mapa daqui não
  // mostra mais os pontos de risco, só PAP ativos e avisos (os riscos que
  // faltam continuam listados, com foto, na página do trajeto).
  const [mostrarPapMapa, setMostrarPapMapa] = useState(true);
  const [mostrarAvisosMapa, setMostrarAvisosMapa] = useState(true);

  const [peregrinacao, setPeregrinacao] = useState(peregrinacaoInicial);
  const [loadingConcluidaId, setLoadingConcluidaId] = useState<string | null>(null);
  const [checkinsCount, setCheckinsCount] = useState(checkinsCountInicial);
  const [checkinsFeitosIds, setCheckinsFeitosIds] = useState(checkinsFeitosIdsInicial);
  const [diasPrevistos, setDiasPrevistos] = useState("");
  const [dataInicioPrevista, setDataInicioPrevista] = useState("");
  const [meioTransporte, setMeioTransporte] = useState<MeioTransporte>("a_pe");
  const [meioTransporteOutro, setMeioTransporteOutro] = useState("");
  // Rodada 23: a pedido do usuário, o cadastro deixou de pedir uma "Rota"
  // separada — a pessoa escolhe direto a cidade de origem (todas as cidades
  // já cadastradas nas duas rotas, agrupadas, ou "Outra cidade/outro
  // estado") e o app deduz sozinho a rota e a cidade de entrada real.
  // `OUTRA_ORIGEM` é o valor especial do select que revela os dois campos
  // extras (nome livre da cidade + por qual cidade da rota ela vai entrar).
  const [origemSelecionada, setOrigemSelecionada] = useState("");
  const [cidadeOrigemLivre, setCidadeOrigemLivre] = useState("");
  const [entradaRotaCidade, setEntradaRotaCidade] = useState("");
  const [detectandoCidade, setDetectandoCidade] = useState(false);
  const [emGrupo, setEmGrupo] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [tamanhoGrupo, setTamanhoGrupo] = useState("");
  // Sempre em branco (Rodada 32, mesmo motivo do "motivo" logo abaixo): não
  // reaproveita o valor salvo no perfil de uma peregrinação anterior — cada
  // peregrinação nova começa com a pergunta em aberto, mesmo que a pessoa já
  // tenha marcado "sim" da última vez.
  const [jaFezTrajeto, setJaFezTrajeto] = useState(false);

  const OUTRA_ORIGEM = "__outra__";

  // Todas as cidades de check-in de todas as rotas, agrupadas por rota e na
  // ordem em que a Dutra passa por elas — a lista completa que alimenta
  // tanto o select principal de "Cidade de origem" quanto, para quem
  // escolhe "Outra cidade", o select de "por qual cidade da rota vai
  // entrar". Cada cidade sabe sua própria rota (p.rota_id), então nenhum
  // seletor de rota separado é mais necessário.
  const gruposCidades = useMemo(
    () =>
      rotas
        .map((r) => ({
          rota: r,
          cidades: todosPontosCheckin
            .filter((p) => p.rota_id === r.id)
            .sort((a, b) => a.ordem - b.ordem),
        }))
        .filter((g) => g.cidades.length > 0),
    [rotas, todosPontosCheckin]
  );
  const todasAsCidades = useMemo(
    () => gruposCidades.flatMap((g) => g.cidades),
    [gruposCidades]
  );

  // Cidade real que vai determinar a rota e o ponto de entrada dos
  // check-ins: a própria origem escolhida (caso comum) ou, para quem
  // escolheu "Outra cidade", a cidade da rota selecionada separadamente.
  const cidadeEntradaEfetiva = origemSelecionada === OUTRA_ORIGEM ? entradaRotaCidade : origemSelecionada;
  const pontoEntrada = todasAsCidades.find((p) => p.cidade === cidadeEntradaEfetiva);

  async function detectarCidadeInicio() {
    if (!navigator.geolocation || todasAsCidades.length === 0) return;
    setDetectandoCidade(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let maisProxima = todasAsCidades[0];
        let menorDist = Infinity;
        for (const p of todasAsCidades) {
          const d = distanciaKm(pos.coords.latitude, pos.coords.longitude, p.latitude, p.longitude);
          if (d < menorDist) {
            menorDist = d;
            maisProxima = p;
          }
        }
        setOrigemSelecionada(maisProxima.cidade);
        setDetectandoCidade(false);
      },
      () => setDetectandoCidade(false)
    );
  }
  // Sempre em branco: o motivo é escolhido a cada nova peregrinação, não é
  // reaproveitado de um valor salvo anteriormente no perfil.
  const [motivo, setMotivo] = useState<Motivo | "">("");
  const [motivoOutro, setMotivoOutro] = useState(perfil.motivo_outro_desc ?? "");
  // Mesma lógica: sempre em branco, não herda de uma peregrinação anterior.
  const [carroApoio, setCarroApoio] = useState(false);
  const [compartilhando, setCompartilhando] = useState(
    peregrinacaoInicial?.compartilhar_localizacao ?? false
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Rodada 46 — posição do peregrino no mapa, acompanhando enquanto ele
  // anda (só durante a caminhada em andamento e com a página aberta).
  const [minhaPosicao, setMinhaPosicao] = useState<{ lat: number; lng: number } | null>(null);
  const emAndamento = peregrinacao?.status === "em_andamento";
  useEffect(() => {
    if (!emAndamento || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMinhaPosicao({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [emAndamento]);

  // Cidades de check-in no mapa: as já feitas ganham o número da sequência
  // em que foram feitas (1º, 2º...), as pendentes ficam sem número.
  const trajetoMapa = useMemo<PontoTrajeto[]>(() => {
    const sequencia = new Map(checkinsFeitosIds.map((id, i) => [id, i + 1]));
    return pontosCheckin.map((p) => ({
      ordem: p.ordem,
      cidade: p.cidade,
      lat: p.latitude,
      lng: p.longitude,
      feito: sequencia.has(p.id),
      sequencia: sequencia.get(p.id) ?? null,
    }));
  }, [pontosCheckin, checkinsFeitosIds]);

  async function salvarDadosPeregrino() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        ja_fez_trajeto: jaFezTrajeto,
        motivo: motivo || null,
        motivo_outro_desc: motivo === "outros" ? motivoOutro : null,
        tem_acompanhamento_carro_apoio: carroApoio,
      })
      .eq("id", user.id);
  }

  async function criarPeregrinacao() {
    setErro(null);
    if (!diasPrevistos) {
      setErro("Selecione os dias previstos de caminhada.");
      return;
    }
    if (!motivo) {
      setErro("Selecione o motivo da sua peregrinação.");
      return;
    }
    if (meioTransporte === "outros" && !meioTransporteOutro.trim()) {
      setErro("Especifique o meio de deslocamento.");
      return;
    }
    if (!origemSelecionada) {
      setErro("Selecione a cidade de origem.");
      return;
    }
    if (origemSelecionada === OUTRA_ORIGEM && !cidadeOrigemLivre.trim()) {
      setErro("Digite o nome da sua cidade de origem.");
      return;
    }
    if (!pontoEntrada) {
      setErro(
        origemSelecionada === OUTRA_ORIGEM
          ? "Selecione por qual cidade da rota você vai entrar."
          : "Não foi possível identificar a rota dessa cidade. Tente selecionar de novo."
      );
      return;
    }
    const cidadeOrigemFinal =
      origemSelecionada === OUTRA_ORIGEM ? cidadeOrigemLivre.trim() : origemSelecionada;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setErro("Sua sessão expirou. Faça login novamente.");
      return;
    }

    // Proteção contra peregrinação duplicada: se a tela ainda mostra o
    // formulário de planejamento por estar desatualizada (ex.: voltou pelo
    // navegador), confirmamos no banco antes de inserir — quem já tem uma
    // peregrinação ativa não deve conseguir criar outra.
    const { data: existente } = await supabase
      .from("peregrinacoes")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["planejada", "em_andamento"])
      .order("criado_em", { ascending: false })
      .maybeSingle();
    if (existente) {
      setLoading(false);
      setErro("Você já tem uma peregrinação ativa. Atualizando a tela...");
      setPeregrinacao(existente as Peregrinacao);
      router.refresh();
      return;
    }

    await salvarDadosPeregrino();

    const { data, error } = await supabase
      .from("peregrinacoes")
      .insert({
        user_id: user.id,
        status: "planejada",
        dias_previstos: diasPrevistos ? Number(diasPrevistos) : null,
        data_inicio_prevista: dataInicioPrevista || null,
        data_inicio: null,
        meio_transporte: meioTransporte,
        meio_transporte_outro_desc: meioTransporte === "outros" ? meioTransporteOutro : null,
        rota_id: pontoEntrada.rota_id,
        cidade_inicio: pontoEntrada.cidade,
        cidade_origem: cidadeOrigemFinal,
        em_grupo: emGrupo,
        nome_grupo: emGrupo ? nomeGrupo || null : null,
        tamanho_grupo: emGrupo && tamanhoGrupo ? Number(tamanhoGrupo) : null,
        compartilhar_localizacao: false,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      // 23505 = violação do índice único que garante uma só peregrinação
      // ativa por usuário (rede de proteção no banco, além da checagem acima).
      if ((error as { code?: string }).code === "23505") {
        setErro("Você já tem uma peregrinação ativa. Atualizando a tela...");
        router.refresh();
        return;
      }
      setErro(error.message);
      return;
    }

    setPeregrinacao(data as Peregrinacao);
  }

  // O primeiro check-in (cidade de início) é feito automaticamente ao
  // iniciar a caminhada. pontosCheckin já vem filtrado (do servidor) a
  // partir da cidade de início escolhida — o primeiro da lista é o ponto de
  // partida real. Rodada 46: confere no banco antes (para não duplicar) e
  // usa o user_id da própria peregrinação, com o erro tratado.
  // Devolve o nome da cidade registrada, ou null quando não havia o que
  // registrar (já feito, ou rota sem pontos).
  async function registrarCheckinInicial(p: Peregrinacao): Promise<string | null> {
    if (!p.rota_id) return null;
    const primeiroPonto = [...pontosCheckin].sort((a, b) => a.ordem - b.ordem)[0];
    if (!primeiroPonto) return null;
    const { data: jaFeito } = await supabase
      .from("checkins")
      .select("id")
      .eq("peregrinacao_id", p.id)
      .eq("ponto_checkin_id", primeiroPonto.id)
      .limit(1);
    if (jaFeito && jaFeito.length > 0) {
      setCheckinsFeitosIds((ids) => (ids.includes(primeiroPonto.id) ? ids : [primeiroPonto.id, ...ids]));
      return null;
    }
    const pos = await obterPosicaoAtual();
    const { error } = await supabase.from("checkins").insert({
      peregrinacao_id: p.id,
      user_id: p.user_id,
      ponto_checkin_id: primeiroPonto.id,
      latitude: pos?.coords.latitude ?? primeiroPonto.latitude,
      longitude: pos?.coords.longitude ?? primeiroPonto.longitude,
    });
    if (error) {
      setErro(`Não foi possível registrar o check-in inicial: ${error.message}`);
      return null;
    }
    setCheckinsCount((c) => c + 1);
    // O inicial é sempre o 1º da sequência no mapa.
    setCheckinsFeitosIds((ids) => (ids.includes(primeiroPonto.id) ? ids : [primeiroPonto.id, ...ids]));
    return primeiroPonto.cidade;
  }

  // Rodada 47 — rede de segurança: uma caminhada em andamento sem nenhum
  // check-in (iniciada antes desta versão, ou se o registro falhou na hora
  // por falta de internet) ganha o check-in inicial ao abrir esta página.
  const checkinInicialConferidoRef = useRef(false);
  useEffect(() => {
    if (checkinInicialConferidoRef.current) return;
    if (!peregrinacao || peregrinacao.status !== "em_andamento") return;
    if (checkinsFeitosIdsInicial.length > 0 || pontosCheckin.length === 0) return;
    const p = peregrinacao;
    const timer = window.setTimeout(() => {
      if (checkinInicialConferidoRef.current) return;
      checkinInicialConferidoRef.current = true;
      registrarCheckinInicial(p).then((cidade) => {
        if (cidade) setMsg(`Check-in inicial em ${cidade} registrado.`);
      });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peregrinacao?.id, peregrinacao?.status]);

  async function iniciarCaminhada() {
    if (!peregrinacao) return;
    setLoading(true);

    // Confere o status atual no banco antes de iniciar — evita reiniciar o
    // cronômetro (e duplicar o check-in inicial) caso a tela esteja
    // desatualizada e a caminhada já tenha sido iniciada antes.
    const { data: atual } = await supabase
      .from("peregrinacoes")
      .select("*")
      .eq("id", peregrinacao.id)
      .maybeSingle();
    if (atual && (atual as Peregrinacao).status === "em_andamento") {
      checkinInicialConferidoRef.current = true;
      await registrarCheckinInicial(atual as Peregrinacao);
      setLoading(false);
      setPeregrinacao(atual as Peregrinacao);
      return;
    }

    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from("peregrinacoes")
      .update({ status: "em_andamento", data_inicio: agora, compartilhar_localizacao: true })
      .eq("id", peregrinacao.id)
      .select()
      .single();

    if (error) {
      setLoading(false);
      setErro(error.message);
      return;
    }

    const atualizada = data as Peregrinacao;
    // Rodada 47 — o check-in inicial é registrado aqui mesmo e a pessoa
    // continua nesta tela, já vendo a cidade de início marcada com o "1" no
    // mapa (antes ia direto para a página do trajeto).
    checkinInicialConferidoRef.current = true;
    const cidade = await registrarCheckinInicial(atualizada);

    setLoading(false);
    setCompartilhando(true);
    setPeregrinacao(atualizada);
    setMsg(
      cidade
        ? `Caminhada iniciada! Check-in inicial em ${cidade} registrado.`
        : "Caminhada iniciada!"
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pararCompartilhamento() {
    if (!peregrinacao) return;
    setCompartilhando(false);
    await supabase.from("localizacoes_ativas").delete().eq("peregrinacao_id", peregrinacao.id);
    await supabase
      .from("peregrinacoes")
      .update({ compartilhar_localizacao: false })
      .eq("id", peregrinacao.id);
  }

  async function retomarCompartilhamento() {
    if (!peregrinacao) return;
    setCompartilhando(true);
    await supabase
      .from("peregrinacoes")
      .update({ compartilhar_localizacao: true })
      .eq("id", peregrinacao.id);
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
        // Rodada 47 — vale a cidade onde o peregrino está (a mais próxima
        // da localização atual), em qualquer ordem: se pulou uma cidade, o
        // registro já cai direto na atual, sem pedir confirmação de
        // distância (o ponto de referência de algumas cidades fica na sede,
        // fora da rodovia, e o check-in é feito quase sempre na Dutra). O
        // sino de proximidade (AlertaProximidade) já passa a cidade certa.
        const alvoPonto = pontoCheckinId
          ? pontosCheckin.find((p) => p.id === pontoCheckinId) ?? null
          : cidadeMaisProxima(pos.coords.latitude, pos.coords.longitude, pontosCheckin);

        if (alvoPonto && checkinsFeitosIds.includes(alvoPonto.id)) {
          setMsg(`Você está em ${alvoPonto.cidade}, e o check-in desta cidade já foi feito.`);
          return;
        }

        const { error } = await supabase.from("checkins").insert({
          peregrinacao_id: peregrinacao.id,
          user_id: peregrinacao.user_id,
          ponto_checkin_id: alvoPonto?.id ?? null,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (error) {
          setErro(error.message);
          return;
        }
        setCheckinsCount((c) => c + 1);
        if (alvoPonto) {
          setCheckinsFeitosIds((ids) => (ids.includes(alvoPonto.id) ? ids : [...ids, alvoPonto.id]));
        }
        setMsg(alvoPonto ? `Check-in em ${alvoPonto.cidade} registrado com sucesso!` : "Check-in registrado com sucesso!");
      },
      () => setErro("Não foi possível acessar sua localização para o check-in."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function finalizarPeregrinacao() {
    if (!peregrinacao) return;
    if (!confirm("Finalizar a peregrinação?")) return;

    // Tenta confirmar, por geolocalização, que o peregrino está em
    // Aparecida-SP. Se a posição não bater (ou não puder ser obtida), avisa
    // mas não bloqueia — o GPS pode falhar ou o peregrino pode estar
    // encerrando de um ponto próximo, não exatamente na Basílica.
    const pontosOrdenadosParaAlvo = [...pontosCheckin].sort((a, b) => a.ordem - b.ordem);
    const pontoAparecida = pontosOrdenadosParaAlvo[pontosOrdenadosParaAlvo.length - 1];
    const alvoLat = pontoAparecida?.latitude ?? APARECIDA_LAT;
    const alvoLng = pontoAparecida?.longitude ?? APARECIDA_LNG;
    const posAtual = await obterPosicaoAtual();
    if (posAtual) {
      const dist = distanciaKm(posAtual.coords.latitude, posAtual.coords.longitude, alvoLat, alvoLng);
      if (dist > DISTANCIA_AVISO_KM) {
        const distTexto = dist < 10 ? dist.toFixed(1) : Math.round(dist).toString();
        if (
          !confirm(
            `Não conseguimos confirmar que você está em Aparecida-SP pela sua localização atual (você parece estar a aproximadamente ${distTexto} km). Deseja finalizar mesmo assim?`
          )
        ) {
          return;
        }
      }
    }

    setLoading(true);
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
      .update({ status: "concluida", data_fim: agora.toISOString(), compartilhar_localizacao: false })
      .eq("id", peregrinacao.id);

    if (updateError) {
      setLoading(false);
      setErro(updateError.message);
      return;
    }

    // Só recebe certificado quem tem check-in inicial em cidade diferente de
    // Aparecida e encerra a peregrinação com check-in em Aparecida.
    const pontosOrdenados = [...pontosCheckin].sort((a, b) => a.ordem - b.ordem);
    const primeiroPonto = pontosOrdenados[0];
    const ultimoPonto = pontosOrdenados[pontosOrdenados.length - 1];
    const elegivel =
      !!primeiroPonto &&
      !!ultimoPonto &&
      primeiroPonto.cidade.trim().toLowerCase() !== "aparecida" &&
      checkinsFeitosIds.includes(ultimoPonto.id);

    // Distância aproximada percorrida, calculada a partir do km_aproximado
    // já cadastrado em cada ponto de check-in (distância acumulada desde a
    // origem da rota, pesquisada com base no traçado real da Dutra — ver
    // Rodada 11) — em vez de integrar uma API de rotas externa, reaproveita
    // esses dados já curados para dar uma distância "aproximada", como
    // pedido pelo usuário.
    const distanciaKmRota =
      primeiroPonto?.km_aproximado != null && ultimoPonto?.km_aproximado != null
        ? Math.round(ultimoPonto.km_aproximado - primeiroPonto.km_aproximado)
        : null;

    setLoading(false);

    if (!elegivel) {
      setMsg(
        "Peregrinação concluída. Certificado não emitido: é necessário ter feito o check-in inicial em uma cidade diferente de Aparecida e o check-in final em Aparecida. Você encontra essa peregrinação na lista de concluídas abaixo."
      );
      setPeregrinacao(null);
      router.refresh();
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
      rota_nome: rotaAtual ? nomeRota(rotaAtual) : null,
      origem: peregrinacao.cidade_origem ?? peregrinacao.cidade_inicio,
      meio_transporte: meioAtual,
      meio_transporte_outro_desc: peregrinacao.meio_transporte_outro_desc,
      duracao_texto: duracaoTexto,
      distancia_km: distanciaKmRota,
    });

    if (certError) {
      setErro(certError.message);
      return;
    }
    router.push("/certificado");
  }

  async function reabrirConcluida(id: string) {
    if (peregrinacao) {
      setErro(
        "Finalize ou exclua a peregrinação atual antes de reabrir uma peregrinação concluída anterior."
      );
      return;
    }
    if (
      !confirm(
        "Reabrir esta peregrinação? Ela voltará para 'em andamento' e o certificado emitido (se houver) deixa de ser válido."
      )
    )
      return;
    setLoadingConcluidaId(id);
    const { error } = await supabase
      .from("peregrinacoes")
      .update({ status: "em_andamento", data_fim: null })
      .eq("id", id);
    setLoadingConcluidaId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    router.refresh();
  }

  async function excluirConcluida(id: string) {
    if (
      !confirm(
        "Excluir esta peregrinação? Essa ação não pode ser desfeita e apaga também seus check-ins e certificado."
      )
    )
      return;
    setLoadingConcluidaId(id);
    const { error } = await supabase.from("peregrinacoes").delete().eq("id", id);
    setLoadingConcluidaId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    router.refresh();
  }

  let principal: ReactNode;

  if (!peregrinacao) {
    principal = (
      <div className="card">
        <h2 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
          Iniciar peregrinação
        </h2>
        {msg && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            {msg}
          </p>
        )}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Dias previstos de peregrinação</label>
            <select
              required
              className="input"
              value={diasPrevistos}
              onChange={(e) => setDiasPrevistos(e.target.value)}
            >
              <option value="" disabled>
                Selecione
              </option>
              {DIAS_PREVISTOS_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "dia" : "dias"}
                </option>
              ))}
            </select>
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
            <label className="label">Meio de deslocamento</label>
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
          {meioTransporte === "outros" && (
            <div>
              <label className="label">Especifique o meio de deslocamento</label>
              <input
                required
                className="input"
                value={meioTransporteOutro}
                onChange={(e) => setMeioTransporteOutro(e.target.value)}
                placeholder="Ex: cavalo, trator..."
              />
            </div>
          )}
          {gruposCidades.length > 0 && (
            <div className="sm:col-span-2">
              <label className="label">Cidade de origem</label>
              <div className="flex gap-2">
                <select
                  required
                  className="input flex-1"
                  value={origemSelecionada}
                  onChange={(e) => {
                    setOrigemSelecionada(e.target.value);
                    setEntradaRotaCidade("");
                  }}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {gruposCidades.map((g) => (
                    <optgroup key={g.rota.id} label={nomeRota(g.rota)}>
                      {g.cidades.map((c) => (
                        <option key={c.id} value={c.cidade}>
                          {c.cidade}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value={OUTRA_ORIGEM}>Outra cidade (outro estado)</option>
                </select>
                <button
                  type="button"
                  onClick={detectarCidadeInicio}
                  disabled={detectandoCidade}
                  title="Usar minha localização atual"
                  className="btn-secondary shrink-0 px-3"
                >
                  <LocateFixed size={18} />
                </button>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Os check-ins mostrados vão começar a partir dela — a rota é
                uma coisa só, mas cada peregrino pode caminhar só uma parte
                dela, entrando por uma cidade mais adiante.
              </p>
              {origemSelecionada === OUTRA_ORIGEM && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-200 p-3 dark:border-amber-900">
                  <div>
                    <label className="label">Qual cidade?</label>
                    <input
                      required
                      className="input"
                      value={cidadeOrigemLivre}
                      onChange={(e) => setCidadeOrigemLivre(e.target.value)}
                      placeholder="Ex: Belo Horizonte - MG"
                    />
                  </div>
                  <div>
                    <label className="label">Por qual cidade da rota você vai entrar</label>
                    <select
                      required
                      className="input"
                      value={entradaRotaCidade}
                      onChange={(e) => setEntradaRotaCidade(e.target.value)}
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {gruposCidades.map((g) => (
                        <optgroup key={g.rota.id} label={nomeRota(g.rota)}>
                          {g.cidades.map((c) => (
                            <option key={c.id} value={c.cidade}>
                              {c.cidade}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-neutral-500">
                      Os check-ins vão começar a partir desta cidade.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="label">Motivo da peregrinação</label>
            <select
              required
              className="input"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as Motivo)}
            >
              <option value="" disabled>
                Selecione
              </option>
              {MOTIVOS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {motivo === "outros" && (
            <div className="sm:col-span-2">
              <label className="label">Descreva o motivo</label>
              <input
                className="input"
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="jafez"
              type="checkbox"
              className="h-4 w-4"
              checked={jaFezTrajeto}
              onChange={(e) => setJaFezTrajeto(e.target.checked)}
            />
            <label htmlFor="jafez" className="text-sm font-medium">
              Já fiz esse trajeto antes
            </label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="carro"
              type="checkbox"
              className="h-4 w-4"
              checked={carroApoio}
              onChange={(e) => setCarroApoio(e.target.checked)}
            />
            <label htmlFor="carro" className="text-sm font-medium">
              Terei acompanhamento de carro de apoio
            </label>
          </div>
          <div className="flex items-center gap-2 pt-2 sm:col-span-2">
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
              <label className="label">Tamanho do grupo</label>
              <input
                type="number"
                min={2}
                className="input"
                value={tamanhoGrupo}
                onChange={(e) => setTamanhoGrupo(e.target.value)}
                placeholder="Quantas pessoas"
              />
            </div>
          )}
          {emGrupo && (
            <div className="sm:col-span-2">
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
        <p className="mb-3 text-xs text-neutral-500">
          Salve seu plano agora; o botão para iniciar a caminhada (e passar a
          compartilhar sua localização com a equipe de apoio) aparece logo em
          seguida, quando você realmente for começar.
        </p>
        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <button disabled={loading} onClick={criarPeregrinacao} className="btn-primary">
            {loading ? "Salvando..." : "Salvar plano"}
          </button>
        </div>
      </div>
    );
  } else if (peregrinacao.status === "planejada") {
    const rotaPlanejada = rotas.find((r) => r.id === peregrinacao.rota_id);
    principal = (
      <div className="card">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-500">
          {peregrinacao.meio_transporte === "bicicleta" ? <Bike size={16} /> : <Footprints size={16} />}
          {labelMeioTransporte(peregrinacao.meio_transporte, peregrinacao.meio_transporte_outro_desc)}
          {rotaPlanejada ? ` — ${nomeRota(rotaPlanejada)}` : ""}
          {(peregrinacao.cidade_origem ?? peregrinacao.cidade_inicio) ? ` — origem: ${peregrinacao.cidade_origem ?? peregrinacao.cidade_inicio}` : ""}
          {peregrinacao.em_grupo
            ? ` — em grupo${peregrinacao.tamanho_grupo ? ` de ${peregrinacao.tamanho_grupo}` : ""}${peregrinacao.nome_grupo ? ` (${peregrinacao.nome_grupo})` : ""}`
            : ""}
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
  } else if (peregrinacao.status === "em_andamento") {
    const rotaAtiva = rotas.find((r) => r.id === peregrinacao.rota_id);
    // Rodada 34: o botão principal não aponta mais para uma cidade
    // pré-definida (ver fazerCheckin) — só precisa saber se ainda há algum
    // check-in pendente, para habilitar o botão e trocar o texto.
    const haCheckinPendente = pontosCheckin.some((p) => !checkinsFeitosIds.includes(p.id));
    principal = (
      <div className="flex flex-col gap-4">
        {/* Módulo 1 — Peregrinação em andamento: dados + linha do tempo com
            origem, check-ins intermediários (destacados ao serem feitos) e
            destino (Aparecida) + controle de compartilhamento de localização. */}
        <div className="card border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <p className="flex items-center justify-center gap-2 text-center font-bold text-green-800 dark:text-green-400">
            <Radio size={18} /> Peregrinação em andamento
          </p>
          <ContadorTempoTotal dataInicio={peregrinacao.data_inicio} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="mt-1 text-justify text-sm text-neutral-600 dark:text-neutral-300">
                {peregrinacao.meio_transporte === "bicicleta" ? <Bike size={14} className="inline" /> : <Footprints size={14} className="inline" />}{" "}
                {labelMeioTransporte(peregrinacao.meio_transporte, peregrinacao.meio_transporte_outro_desc)}
                {rotaAtiva ? ` — ${nomeRota(rotaAtiva)}` : ""}
                {(peregrinacao.cidade_origem ?? peregrinacao.cidade_inicio) ? ` — origem: ${peregrinacao.cidade_origem ?? peregrinacao.cidade_inicio}` : ""}
                {peregrinacao.em_grupo
                  ? ` — em grupo${peregrinacao.tamanho_grupo ? ` de ${peregrinacao.tamanho_grupo}` : ""}${peregrinacao.nome_grupo ? ` (${peregrinacao.nome_grupo})` : ""}`
                  : ""}
                {". Iniciada em "}
                {peregrinacao.data_inicio
                  ? new Date(peregrinacao.data_inicio).toLocaleString("pt-BR")
                  : "-"}
                .
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

          <div className="mt-4 border-t border-green-200/70 pt-4 dark:border-green-900/50">
            <TrajetoTimelineCompact pontosCheckin={pontosCheckin} checkinsFeitosIds={checkinsFeitosIds} />
          </div>

          <div className="mt-4 flex items-center justify-center border-t border-green-200/70 pt-3 dark:border-green-900/50">
            {compartilhando ? (
              <button
                onClick={pararCompartilhamento}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-300"
              >
                <MapPin size={14} /> Localização compartilhada — pausar
              </button>
            ) : (
              <button
                onClick={retomarCompartilhamento}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-500"
              >
                <MapPin size={14} /> Compartilhamento pausado — retomar
              </button>
            )}
          </div>
        </div>

        {/* Módulo 2 — Fazer check-in, sozinho acima do mapa (Rodada 20: antes
            dividia a linha com "Informe sinistro ou suspeita", que desceu
            para depois do mapa, ver abaixo). */}
        <div className="card">
          <h2 className="mb-2 text-center text-base font-bold text-amber-800 dark:text-amber-500">
            Fazer check-in
          </h2>
          <p className="mb-3 text-xs text-neutral-500" style={{ textAlign: "left" }}>
            O check-in inicial foi feito ao iniciar a caminhada. O
            certificado sai com ele e o check-in final em Aparecida; os
            check-ins nas cidades do caminho ficam como registro da sua
            peregrinação. O app registra a cidade onde você está, mesmo que
            tenha passado por outra sem fazer check-in.
          </p>
          <button
            onClick={() => fazerCheckin()}
            disabled={!haCheckinPendente}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />{" "}
            {haCheckinPendente ? "Fazer check-in" : "Todos os check-ins feitos"}
          </button>
          {msg && <p className="mt-2 text-center text-sm text-green-700">{msg}</p>}
        </div>

        {/* Módulo 3 — mapa combinado: PAP ativos, pontos de risco e avisos
            de peregrinos da rota atual, todos ativos por padrão, com filtro
            para desligar cada camada (Rodada 20 — antes só mostrava PAP). */}
        <div className="card">
          <h2 className="mb-3 flex items-center justify-center gap-2 text-center text-base font-bold text-amber-800 dark:text-amber-500">
            <MapPinned size={18} /> PAP e avisos na rota
          </h2>
          <div className="mb-3 flex flex-wrap justify-center gap-4 text-sm font-medium">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarPapMapa}
                onChange={(e) => setMostrarPapMapa(e.target.checked)}
              />
              <Tent size={16} className="text-green-600" /> PAP ativos hoje ({pontosApoio.length + papsPreCadastro.length})
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mostrarAvisosMapa}
                onChange={(e) => setMostrarAvisosMapa(e.target.checked)}
              />
              <Megaphone size={16} className="text-orange-600" /> Avisos ({avisos.length})
            </label>
          </div>
          <p className="mb-2 text-center text-xs text-neutral-500" style={{ textAlign: "center" }}>
            Ponto azul: você. Cidades com número: seus check-ins, na ordem
            em que foram feitos. Toque num aviso para confirmar que ainda
            está lá ou informar que já não existe.
          </p>
          <MapView
            pontosApoio={mostrarPapMapa ? pontosApoio : SEM_PAP}
            papsPreCadastro={mostrarPapMapa ? papsPreCadastro : SEM_PRE}
            avisos={mostrarAvisosMapa ? avisos : SEM_AVISO}
            trajeto={trajetoMapa}
            minhaPosicao={minhaPosicao}
            onVotarAviso={votarAviso}
            height="400px"
            zoom={8}
          />
        </div>

        {/* Módulo 4 — Informe sinistro ou suspeita, abaixo do mapa (Rodada
            20). Rodada 46: botão grande, vermelho forte, ocupando a largura
            toda — é o que precisa ser achado rápido numa emergência. */}
        <div className="card border-red-200 dark:border-red-900">
          <InformarSinistro rotaId={peregrinacao.rota_id} destaque />
          <p className="mt-2 text-center text-xs text-neutral-500" style={{ textAlign: "center" }}>
            Acidente, pessoa em perigo, algo suspeito ou chuva forte no
            caminho? Avise os outros peregrinos — usamos sua localização.
          </p>
        </div>

        {erro && <p className="text-center text-sm text-red-600">{erro}</p>}

        {/* Módulo final, em uma linha — Concluir. */}
        <div className="card">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-center text-base font-bold text-amber-800 dark:text-amber-500">
            <Award size={18} /> Concluir
          </h2>
          <p className="mx-auto mb-4 max-w-md text-justify text-sm text-neutral-600 dark:text-neutral-300">
            Ao finalizar, tentaremos confirmar por localização que você está
            em Aparecida-SP — se não conseguirmos, você poderá confirmar
            manualmente. Seu certificado de peregrino será gerado
            automaticamente, desde que você tenha feito o check-in inicial
            fora de Aparecida e o check-in final em Aparecida.
          </p>
          <div className="flex justify-center">
            <button disabled={loading} onClick={finalizarPeregrinacao} className="btn-primary">
              {loading ? "Finalizando..." : "Finalizar peregrinação"}
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    // Status "cancelada" ou algum outro caso não esperado — trata como se
    // não houvesse peregrinação ativa.
    principal = null;
  }

  return (
    <div className="flex flex-col gap-6">
      {principal}

      {peregrinacoesConcluidas.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
            <Award size={20} /> Peregrinações concluídas
          </h2>
          <div className="flex flex-col gap-3">
            {peregrinacoesConcluidas.map((p) => {
              const rota = rotas.find((r) => r.id === p.rota_id);
              return (
                <div key={p.id} className="card flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-500">
                      {p.meio_transporte === "bicicleta" ? <Bike size={16} /> : <Footprints size={16} />}
                      {labelMeioTransporte(p.meio_transporte, p.meio_transporte_outro_desc)}
                      {rota ? ` — ${nomeRota(rota)}` : ""}
                    </p>
                    {/* Movido para cá na Rodada 16 (antes ficava dentro da
                        página de certificado, ao lado do certificado grátis)
                        — só faz sentido quando esta peregrinação já tem
                        certificado emitido. */}
                    {p.certificadoId && (
                      <a
                        href={
                          p.plusPago
                            ? `/certificado/plus/${p.certificadoId}`
                            : `/certificado#romaria-plus-${p.certificadoId}`
                        }
                        className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-500"
                      >
                        <Sparkles size={12} />
                        {p.plusPago ? "Minhas fotos da Romaria Plus →" : "Adquirir Certificado Plus + arte de 5 fotos →"}
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {p.data_inicio ? new Date(p.data_inicio).toLocaleDateString("pt-BR") : "-"}
                    {" a "}
                    {p.data_fim ? new Date(p.data_fim).toLocaleDateString("pt-BR") : "-"}
                    {!p.temCertificado && " — sem certificado"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {p.temCertificado && (
                      <a href="/certificado" className="btn-secondary text-xs">
                        Ver certificado
                      </a>
                    )}
                    <button
                      disabled={loadingConcluidaId === p.id || !!peregrinacao}
                      onClick={() => reabrirConcluida(p.id)}
                      title={
                        peregrinacao
                          ? "Finalize ou exclua a peregrinação atual antes de reabrir esta"
                          : undefined
                      }
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      <RotateCcw size={14} /> Reabrir
                    </button>
                    <button
                      disabled={loadingConcluidaId === p.id}
                      onClick={() => excluirConcluida(p.id)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
