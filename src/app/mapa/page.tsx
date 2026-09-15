import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapClient from "./MapClient";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus, TriangleAlert } from "lucide-react";
import { nomeRota } from "@/lib/constants";
import type { PontoApoio, PontoRisco, RiscoInformado, Rota, PontoCheckin, PapPreCadastro } from "@/types/database";
import type { PapPreCadastroMapa } from "@/components/MapView";

function normalizarCidade(cidade: string) {
  return cidade.trim().toLowerCase();
}

// Cores claras (pastel), para diferenciar visualmente as duas rotas sem
// competir com as cores mais fortes já usadas por PAP/risco/avisos.
const COR_ROTA: Record<string, string> = {
  norte: "#7dd3fc",
  sul: "#fdba74",
};

export default async function MapaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!perfil?.is_admin;
  }

  const [
    { data: pontosApoio },
    { data: pontosRisco },
    { data: avisos },
    { data: localizacoes },
    { data: rotas },
    { data: pontosCheckin },
    { data: papsPreCadastroData },
  ] = await Promise.all([
    supabase
      .from("pontos_apoio")
      .select("*")
      .eq("status_aprovacao", "aprovado"),
    supabase.from("pontos_risco").select("*"),
    // RLS já filtra: só vêm avisos confirmados pela administração ou
    // publicados automaticamente dentro da janela de tempo (ver migration 11).
    supabase.from("riscos_informados").select("*").order("criado_em", { ascending: false }),
    isAdmin
      ? supabase.from("localizacoes_ativas").select("user_id, latitude, longitude")
      : Promise.resolve({ data: [] as { user_id: string; latitude: number; longitude: number }[] }),
    supabase.from("rotas").select("*").order("ordem"),
    supabase.from("pontos_checkin").select("*").order("ordem"),
    // Só os ainda não vinculados a um gerente — assim que alguém vincula, o
    // ponto sai daqui e passa a ser representado pelo PAP real (pontos_apoio,
    // já com localização exata) quando a divulgação for aprovada.
    supabase.from("paps_pre_cadastro").select("*").is("reivindicado_por", null),
  ]);

  const rotasLinhas = ((rotas ?? []) as Rota[]).map((r) => ({
    nome: nomeRota(r),
    cor: COR_ROTA[r.slug] ?? r.cor,
    pontos: ((pontosCheckin ?? []) as PontoCheckin[])
      .filter((p) => p.rota_id === r.id)
      .map((p) => ({ lat: p.latitude, lng: p.longitude, ordem: p.ordem })),
  }));

  // O pré-cadastro não tem coordenadas próprias — usamos a localização do
  // ponto de check-in da mesma cidade como aproximação, só para situar o PAP
  // no mapa antes de ser vinculado. Sem cidade correspondente, não dá para
  // aproximar e o ponto fica de fora do mapa (mas continua na lista de busca
  // do cadastro do gerente).
  const cidadeParaCoord = new Map<string, { lat: number; lng: number }>();
  for (const p of (pontosCheckin ?? []) as PontoCheckin[]) {
    const chave = normalizarCidade(p.cidade);
    if (!cidadeParaCoord.has(chave)) {
      cidadeParaCoord.set(chave, { lat: p.latitude, lng: p.longitude });
    }
  }
  const papsPreCadastro: PapPreCadastroMapa[] = [];
  for (const p of (papsPreCadastroData ?? []) as PapPreCadastro[]) {
    // Posição marcada manualmente pela administração (Rodada 13) tem
    // prioridade sobre a aproximação por cidade.
    const coord =
      p.latitude != null && p.longitude != null
        ? { lat: p.latitude, lng: p.longitude }
        : p.cidade
          ? cidadeParaCoord.get(normalizarCidade(p.cidade))
          : undefined;
    if (!coord) continue;
    papsPreCadastro.push({
      id: p.id,
      nome: p.nome,
      cidade: p.cidade ?? "",
      br: p.br,
      km: p.km,
      sentido_pista: p.sentido_pista,
      lat: coord.lat,
      lng: coord.lng,
    });
  }

  return (
    <div>
      <VoltarButton href="/" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa de Apoio e Segurança</h1>
          <p className="text-sm text-neutral-500">
            PAP — Pontos de Apoio ao Peregrino (tenda verde = confirmado pela
            administração; tenda cinza tracejada = aguardando vínculo de um
            gerente, localização aproximada), locais de risco (bandeira
            vermelha ou amarela) e avisos recentes de peregrinos (sinistro,
            suspeita ou chuva, em laranja). Use as opções abaixo do mapa para
            mostrar ou esconder cada camada.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/pap/novo"
            className="btn-primary flex items-center gap-1 whitespace-nowrap"
          >
            <MapPinPlus size={18} /> Cadastrar PAP
          </Link>
        )}
      </div>

      <MapClient
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        pontosRisco={(pontosRisco ?? []) as PontoRisco[]}
        avisos={(avisos ?? []) as RiscoInformado[]}
        peregrinos={localizacoes ?? []}
        rotasLinhas={rotasLinhas}
        papsPreCadastro={papsPreCadastro}
      />

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        Sempre esteja atento à sua segurança: observe o trânsito, evite
        caminhar à noite em trechos sem iluminação e, em caso de emergência,
        use o botão vermelho no canto da tela.
      </p>

      <p className="mt-2 text-xs text-neutral-400">
        A localização de peregrinos em caminhada não é exibida publicamente
        neste mapa — ela é usada apenas pela administração para avisar sobre
        condições adversas e para localizar peregrinos em caso de emergência.
      </p>
      {user && !isAdmin && (
        <p className="mt-2 text-sm text-neutral-500">
          Novos PAP são cadastrados por gerentes de PAP aprovados ou pela
          equipe administrativa.{" "}
          <Link href="/gerente-pap/cadastro" className="font-semibold text-amber-700 dark:text-amber-500">
            Quer cadastrar o seu?
          </Link>
        </p>
      )}
    </div>
  );
}
