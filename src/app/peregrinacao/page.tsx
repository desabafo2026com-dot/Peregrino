import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PeregrinacaoClient from "./PeregrinacaoClient";
import VoltarButton from "@/components/VoltarButton";
import { kmPertenceARota, avisoVisivelPublicamente } from "@/lib/constants";
import type { Peregrinacao, PontoApoio, PontoCheckin, PontoRisco, RiscoInformado, Profile, Rota } from "@/types/database";

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
  if (!perfil) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/" />
        <p className="mb-4 text-neutral-600 dark:text-neutral-300">
          Complete seu perfil antes de iniciar a peregrinação.
        </p>
        <Link href="/perfil" className="btn-primary inline-block">
          Completar perfil
        </Link>
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
  const hoje = new Date();
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;
  const [
    { data: peregrinacao },
    { data: concluidasData },
    { data: certificadosData },
    { data: pontosApoio },
    { data: rotas },
    { data: todosPontosCheckinData },
  ] = await Promise.all([
    supabase
      .from("peregrinacoes")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["planejada", "em_andamento"])
      .order("criado_em", { ascending: false })
      .maybeSingle(),
    supabase
      .from("peregrinacoes")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "concluida")
      .order("data_fim", { ascending: false }),
    supabase.from("certificados").select("id, peregrinacao_id").eq("user_id", user.id),
    // PAPs ativos hoje (para o módulo de mapa em "Minha peregrinação") — só
    // entram os que estão marcados como ativos, aprovados e com a data de
    // hoje no calendário de funcionamento.
    supabase
      .from("pontos_apoio")
      .select("*")
      .eq("ativo", true)
      .eq("status_aprovacao", "aprovado")
      .contains("datas_funcionamento", [hojeISO]),
    supabase.from("rotas").select("*").order("ordem"),
    // Todos os pontos de check-in de todas as rotas — usados tanto para a
    // lista "Cidade de início na Dutra" do formulário de planejamento
    // quanto, já filtrados pela cidade de início escolhida, para a
    // caminhada ativa.
    supabase.from("pontos_checkin").select("*").order("ordem"),
  ]);
  const todosPontosCheckin = (todosPontosCheckinData ?? []) as PontoCheckin[];

  // Mapa peregrinacao_id -> certificado_id — usado tanto para "Ver
  // certificado" quanto para o link do Certificado Plus (Rodada 16, movido
  // para esta lista) de cada peregrinação concluída.
  const certificadoIdPorPeregrinacao = new Map<string, string>();
  (certificadosData ?? []).forEach((c) => {
    certificadoIdPorPeregrinacao.set(c.peregrinacao_id as string, c.id as string);
  });

  // Quais desses certificados já têm a Romaria Plus paga (Rodada 18) — o
  // link muda de "adquirir" para "ver minhas fotos" quando já paga, em vez
  // de mandar de novo para a tela de compra.
  const idsCertificados = Array.from(certificadoIdPorPeregrinacao.values());
  const { data: comprasPagas } = idsCertificados.length
    ? await supabase
        .from("compras_romaria_plus")
        .select("certificado_id")
        .eq("status", "pago")
        .in("certificado_id", idsCertificados)
    : { data: [] as { certificado_id: string }[] | null };
  const certificadosComPlusPago = new Set((comprasPagas ?? []).map((c) => c.certificado_id as string));

  const peregrinacoesConcluidas = (concluidasData ?? []).map((p) => ({
    ...(p as Peregrinacao),
    temCertificado: certificadoIdPorPeregrinacao.has(p.id as string),
    certificadoId: certificadoIdPorPeregrinacao.get(p.id as string) ?? null,
    plusPago: certificadoIdPorPeregrinacao.has(p.id as string)
      ? certificadosComPlusPago.has(certificadoIdPorPeregrinacao.get(p.id as string) as string)
      : false,
  }));

  let checkinsCount = 0;
  let pontosCheckin: PontoCheckin[] = [];
  let checkinsFeitosIds: string[] = [];
  // Pontos de risco e avisos de peregrinos da rota atual (Rodada 20) — o
  // mapa de "Minha peregrinação" passou a mostrar essas duas camadas junto
  // com os PAP ativos, com filtro para desativar cada uma. Mesma lógica já
  // usada em /peregrinacao/trajeto: risco entra pela rota se o km bater
  // (kmPertenceARota) ou, sem km cadastrado, pela rota_id; aviso entra se
  // for da rota atual ou sem rota marcada.
  let pontosRisco: PontoRisco[] = [];
  let avisos: RiscoInformado[] = [];

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
              .from("riscos_informados")
              .select("*")
              .or(`rota_id.eq.${peregrinacao.rota_id},rota_id.is.null`)
              .order("criado_em", { ascending: false }),
          ])
        : Promise.resolve(null),
      supabase
        .from("checkins")
        .select("ponto_checkin_id")
        .eq("peregrinacao_id", peregrinacao.id)
        .not("ponto_checkin_id", "is", null),
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
        peregrinacoesConcluidas={peregrinacoesConcluidas}
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        pontosRisco={pontosRisco}
        avisos={avisos}
        rotas={(rotas ?? []) as Rota[]}
        checkinsCount={checkinsCount}
        pontosCheckin={pontosCheckin}
        todosPontosCheckin={todosPontosCheckin}
        checkinsFeitosIds={checkinsFeitosIds}
      />
    </div>
  );
}
