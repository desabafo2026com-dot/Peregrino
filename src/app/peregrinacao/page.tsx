import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PeregrinacaoClient from "./PeregrinacaoClient";
import VoltarButton from "@/components/VoltarButton";
import AltimetriaGrafico from "@/components/AltimetriaGrafico";
import IntencaoForm, { type IntencaoAtual } from "@/components/IntencaoForm";
import CadernoDeBordo from "@/components/CadernoDeBordo";
import type { DadosCarimbo } from "@/components/CarimboPap";
import TempoNoCaminho from "@/components/TempoNoCaminho";
import { perfilAltimetria, subidaEntre } from "@/lib/altimetria";
import { previsaoCaminho } from "@/lib/tempo-caminho";
import { CloudSun, Mountain } from "lucide-react";
import { kmPertenceARota, avisoVisivelPublicamente, hojeISO } from "@/lib/constants";
import { posicionarPapsPreCadastro } from "@/lib/pap-pre-cadastro-mapa";
import type { Peregrinacao, PontoApoio, PontoCheckin, PontoRisco, RiscoInformado, Profile, Rota, PapPreCadastro } from "@/types/database";

export default async function PeregrinacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/peregrinacao");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Até a Rodada 22, uma conta de gerente de PAP sem perfil próprio de
  // peregrino era mandada direto de volta para "/gerente-pap" ao tentar
  // abrir esta página — pensado originalmente (Rodada 9) para uma conta
  // recém-criada como gerente não cair sem querer no fluxo de peregrino.
  // Mas isso também fechava a única porta que uma conta só-gerente teria
  // para se tornar peregrino com a mesma conta: não existe (nem existia)
  // nenhum "/peregrinacao/cadastro" equivalente ao "/gerente-pap/cadastro"
  // que já deixa um peregrino virar gerente. Rodada 23, a pedido do
  // usuário ("ao contrário não acontece, a pessoa tem que logar de novo"):
  // o redirecionamento foi removido — uma conta só-gerente que chega aqui
  // (pelo novo link em /gerente-pap, "Quero também fazer minha
  // peregrinação") cai direto na tela de completar perfil abaixo, iniciando
  // sua peregrinação com a mesma conta, sem precisar de nenhum cadastro
  // novo. Continua chegando aqui, como sempre, só por navegação explícita —
  // o link/atalho de "Meu PAP"/"Área do Gerente de PAP" nunca aponta para
  // cá sozinho.
  // Rodada 62 — o cadastro só pede o nome; aqui, para planejar e registrar
  // a peregrinação, o perfil precisa estar completo.
  const p0 = perfil as Profile | null;
  const perfilCompletoParaPeregrinar = !!(p0 && p0.cidade && p0.telefone && p0.data_nascimento && p0.sexo);
  // Quem já está no meio de uma caminhada nunca é barrado aqui.
  const { data: emAndamento } = perfilCompletoParaPeregrinar
    ? { data: null }
    : await supabase
        .from("peregrinacoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "em_andamento")
        .limit(1)
        .maybeSingle();
  if (!p0 || (!perfilCompletoParaPeregrinar && !emAndamento)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <VoltarButton href="/painel" />
        <div className="card flex flex-col items-center gap-3">
          <p className="font-bold text-amber-800 dark:text-amber-500">Falta pouco para planejar sua peregrinação</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
            Para registrar a caminhada, os check-ins e emitir o certificado, complete seu perfil (falta o
            telefone de contato ou outro dado). É rapidinho.
          </p>
          <Link href="/perfil?completar=peregrinacao" className="btn-primary inline-block">
            Completar perfil
          </Link>
          {p0?.is_organizador && (
            <Link href="/romarias-grupo/cadastro" className="btn-secondary inline-block">
              Cadastrar Romaria (organizador)
            </Link>
          )}
        </div>
      </div>
    );
  }

  // As seis consultas abaixo são todas independentes entre si (nenhuma usa
  // o resultado de outra) — antes rodavam uma de cada vez, em sequência,
  // e cada ida-e-volta ao banco soma seu tempo de rede ao carregamento
  // desta página, que é a mais visitada do app. Rodando juntas num só
  // Promise.all elas saem ao mesmo tempo (Rodada 30, a pedido do usuário
  // sobre o site/iPhone estarem "meio lentos" — sem mudar nenhum dado
  // retornado, só o tempo até ele chegar).
  // Rodada 39 — antes calculava "hoje" aqui mesmo com `new Date()` no fuso
  // do processo (UTC no servidor), sujeito ao mesmo bug de fuso horário
  // corrigido em `hojeISO()` (ver comentário em src/lib/constants.ts):
  // entre ~21h e 23h59 de Brasília, um PAP ativo hoje podia sumir do mapa
  // de "Minha peregrinação" por comparar com a data de amanhã em UTC.
  const hojeISOStr = hojeISO();
  const [
    { data: peregrinacao },
    { data: pontosApoio },
    { data: rotas },
    { data: todosPontosCheckinData },
    { data: papsPreAtivosData },
    { data: basePapsPre },
  ] = await Promise.all([
    supabase
      .from("peregrinacoes")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["planejada", "em_andamento"])
      .order("criado_em", { ascending: false })
      .maybeSingle(),
    // PAPs ativos hoje (para o módulo de mapa em "Minha peregrinação") — só
    // entram os que estão marcados como ativos, aprovados e com a data de
    // hoje no calendário de funcionamento.
    supabase
      .from("pontos_apoio_publico")
      .select("*")
      .eq("ativo", true)
      .eq("status_aprovacao", "aprovado")
      .contains("datas_funcionamento", [hojeISOStr]),
    supabase.from("rotas").select("*").order("ordem"),
    // Todos os pontos de check-in de todas as rotas — usados tanto para a
    // lista "Cidade de início na Dutra" do formulário de planejamento
    // quanto, já filtrados pela cidade de início escolhida, para a
    // caminhada ativa.
    supabase.from("pontos_checkin").select("*").order("ordem"),
    // Rodada 46 — PAP do pré-cadastro ainda sem gerente e ativos hoje (a
    // mesma regra do contador "Ativos" do painel e do filtro do mapa do
    // admin), para o mapa daqui mostrar todos os PAP ativos, não só os já
    // vinculados por um gerente.
    supabase
      .from("paps_pre_cadastro_visiveis")
      .select("*")
      .contains("datas_funcionamento", [hojeISOStr]),
    supabase.from("paps_pre_cadastro").select("cidade, km"),
  ]);
  const todosPontosCheckin = (todosPontosCheckinData ?? []) as PontoCheckin[];
  const papsPreCadastro = posicionarPapsPreCadastro({
    paps: (papsPreAtivosData ?? []) as PapPreCadastro[],
    baseCidadeKm: (basePapsPre ?? []) as { cidade: string | null; km: number | null }[],
    rotas: (rotas ?? []) as Rota[],
    pontosCheckin: todosPontosCheckin,
  });

  let checkinsCount = 0;
  let pontosCheckin: PontoCheckin[] = [];
  let checkinsFeitosIds: string[] = [];
  // Avisos de peregrinos da rota atual (Rodada 20): entram se forem da
  // rota atual ou sem rota marcada.
  let avisos: RiscoInformado[] = [];
  // Pontos de risco da rota (Rodada 48: voltaram ao mapa daqui, desmarcados
  // por padrão, e o próprio app filtra só os que faltam até Aparecida). Risco
  // entra pela rota se o km bater (kmPertenceARota) ou, sem km cadastrado,
  // pela rota_id.
  let pontosRisco: PontoRisco[] = [];

  if (peregrinacao) {
    const rotaAtual = peregrinacao.rota_id
      ? ((rotas ?? []) as Rota[]).find((r) => r.id === peregrinacao.rota_id)
      : undefined;

    if (peregrinacao.rota_id) {
      const pontosRota = todosPontosCheckin.filter((p) => p.rota_id === peregrinacao.rota_id);
      const ordemInicio = peregrinacao.cidade_inicio
        ? (pontosRota.find((p) => p.cidade === peregrinacao.cidade_inicio)?.ordem ?? 1)
        : 1;
      pontosCheckin = pontosRota.filter((p) => p.ordem >= ordemInicio);
    }

    // De novo, três consultas independentes entre si (a contagem de
    // check-ins, os riscos/avisos da rota atual, e a lista de check-ins já
    // feitos) — juntas num só Promise.all em vez de uma atrás da outra
    // (Rodada 30).
    const [{ count }, riscosResultado, { data: feitos }] = await Promise.all([
      supabase
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("peregrinacao_id", peregrinacao.id),
      peregrinacao.rota_id
        ? Promise.all([
            supabase.from("pontos_risco").select("*"),
            // A RLS sozinha não basta para filtrar isto: além da política
            // pública por tempo (migration 17/26), existe uma política
            // separada que dá acesso irrestrito a quem enviou o relato e a
            // administradores — então uma conta de admin, ou a própria
            // autora de um aviso antigo, receberia de volta linhas que já
            // deveriam ter expirado para o público. `avisoVisivelPublicamente`
            // reaplica a mesma regra de visibilidade aqui no app (Rodada 21)
            // para este mapa mostrar sempre o que qualquer peregrino veria,
            // não o que a conta logada tem permissão de enxergar por outro
            // motivo.
            supabase
              // Rodada 59 — view pública dos avisos (sem identificar quem enviou).
              .from("avisos_publicos")
              .select("*")
              .or(`rota_id.eq.${peregrinacao.rota_id},rota_id.is.null`)
              .order("criado_em", { ascending: false }),
          ])
        : Promise.resolve(null),
      supabase
        .from("checkins")
        .select("ponto_checkin_id")
        .eq("peregrinacao_id", peregrinacao.id)
        .not("ponto_checkin_id", "is", null)
        // Na ordem em que foram feitos — o mapa numera os check-ins nessa
        // sequência (Rodada 46).
        .order("criado_em", { ascending: true }),
    ]);
    checkinsCount = count ?? 0;

    if (riscosResultado) {
      const [{ data: todosRiscos }, { data: avisosData }] = riscosResultado;
      pontosRisco = rotaAtual
        ? ((todosRiscos ?? []) as PontoRisco[]).filter((r) =>
            r.km_referencia != null
              ? kmPertenceARota(r.km_referencia, rotaAtual.slug)
              : r.rota_id === null || r.rota_id === rotaAtual.id
          )
        : [];
      avisos = ((avisosData ?? []) as RiscoInformado[]).filter(avisoVisivelPublicamente);
    }

    checkinsFeitosIds = (feitos ?? [])
      .map((f) => f.ponto_checkin_id as string | null)
      .filter((v): v is string => !!v);
  }

  // Rodada 65 — pedido ou agradecimento da peregrinação (opcional).
  const { data: intencaoData } = peregrinacao
    ? await supabase
        .from("intencoes_peregrinacao")
        .select("id, tipo, texto, publico, ativo")
        .eq("peregrinacao_id", peregrinacao.id)
        .maybeSingle()
    : { data: null };

  // Rodada 68 — caderno de bordo (carimbos dos PAPs lidos pelo QR code).
  const { data: carimbosData } =
    peregrinacao && (peregrinacao.status === "em_andamento" || peregrinacao.status === "planejada")
      ? await supabase
          .from("carimbos_caderno")
          .select("id, pap_nome, cidade, km, carimbado_em")
          .eq("peregrinacao_id", peregrinacao.id)
          .order("carimbado_em", { ascending: true })
      : { data: null };

  // Rodada 64 — altimetria da rota (com a posição pelo último check-in) e
  // tempo nas próximas cidades do caminho.
  let perfilAlt: Awaited<ReturnType<typeof perfilAltimetria>> = null;
  let previsoes: Awaited<ReturnType<typeof previsaoCaminho>> = null;
  let kmAtual: number | null = null;
  let proximos: { km: number; subida: number; descida: number } | null = null;
  if (peregrinacao?.rota_id) {
    const pontosRotaOrdenados = todosPontosCheckin
      .filter((p) => p.rota_id === peregrinacao.rota_id)
      .sort((a, b) => a.ordem - b.ordem);
    const feitos = new Set(checkinsFeitosIds);
    const ultimoFeito = [...pontosRotaOrdenados].reverse().find((p) => feitos.has(p.id)) ?? null;
    const ordemBase = ultimoFeito?.ordem ?? pontosCheckin[0]?.ordem ?? 1;
    const aFrente = pontosRotaOrdenados.filter((p) => p.ordem >= ordemBase).slice(0, 6);
    [perfilAlt, previsoes] = await Promise.all([
      perfilAltimetria(pontosRotaOrdenados),
      previsaoCaminho(aFrente.map((p) => ({ cidade: p.cidade, lat: p.latitude, lng: p.longitude }))),
    ]);
    if (perfilAlt && peregrinacao.status === "em_andamento" && ultimoFeito) {
      const idx = pontosRotaOrdenados.findIndex((p) => p.id === ultimoFeito.id);
      kmAtual = perfilAlt.cidades[idx]?.km ?? null;
      if (kmAtual != null && kmAtual < perfilAlt.kmTotal) {
        proximos = { km: 10, ...subidaEntre(perfilAlt, kmAtual, kmAtual + 10) };
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">
        {peregrinacao ? "Minha peregrinação" : "Planejar peregrinação"}
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        {peregrinacao
          ? "Inicie sua caminhada, compartilhe sua localização e faça check-in nos pontos de apoio."
          : "Escolha rota, dias previstos e cidade de início para planejar sua caminhada até Aparecida-SP."}
      </p>
      <PeregrinacaoClient
        perfil={perfil as Profile}
        peregrinacaoInicial={peregrinacao as Peregrinacao | null}
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        papsPreCadastro={papsPreCadastro}
        pontosRisco={pontosRisco}
        avisos={avisos}
        rotas={(rotas ?? []) as Rota[]}
        checkinsCount={checkinsCount}
        pontosCheckin={pontosCheckin}
        todosPontosCheckin={todosPontosCheckin}
        checkinsFeitosIds={checkinsFeitosIds}
      />
      {peregrinacao && (peregrinacao.status === "planejada" || peregrinacao.status === "em_andamento") && (
        <div id="caderno" className="mt-6 scroll-mt-6">
          <CadernoDeBordo
            carimbos={(carimbosData ?? []) as DadosCarimbo[]}
            capa={{
              nome: p0.nome_completo,
              ano: (peregrinacao.data_inicio ? new Date(peregrinacao.data_inicio) : new Date()).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                year: "numeric",
              }),
              origem: peregrinacao.cidade_origem ?? peregrinacao.cidade_inicio ?? null,
              periodo: peregrinacao.data_inicio
                ? `Início em ${new Date(peregrinacao.data_inicio).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                : null,
            }}
          />
        </div>
      )}
      {peregrinacao && (peregrinacao.status === "planejada" || peregrinacao.status === "em_andamento") && (
        <div className="mt-6">
          <IntencaoForm
            peregrinacaoId={peregrinacao.id}
            userId={user.id}
            inicial={(intencaoData as IntencaoAtual | null) ?? null}
          />
        </div>
      )}
      {previsoes && previsoes.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
            <CloudSun size={20} /> Tempo nas próximas cidades
          </h2>
          <div className="card">
            <TempoNoCaminho previsoes={previsoes} />
          </div>
        </section>
      )}
      {perfilAlt && (
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
            <Mountain size={20} /> Altimetria do trajeto
          </h2>
          <div className="card">
            <AltimetriaGrafico perfil={perfilAlt} kmAtual={kmAtual} proximos={proximos} />
          </div>
        </section>
      )}
    </div>
  );
}
