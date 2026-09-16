import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PeregrinacaoClient from "./PeregrinacaoClient";
import VoltarButton from "@/components/VoltarButton";
import { kmPertenceARota } from "@/lib/constants";
import type { Peregrinacao, PontoApoio, PontoCheckin, PontoRisco, RiscoInformado, Profile, Rota } from "@/types/database";

export default async function PeregrinacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/peregrinacao");

  const { data: gerente } = await supabase
    .from("gerentes_pap")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Uma conta de gerente de PAP que nunca teve perfil próprio de peregrino
  // (sem linha em `profiles`) tem sua própria área e nunca acessa o fluxo
  // de peregrino — mandada direto para lá. Mas uma conta que acumula os
  // dois papéis (tem linha em `profiles` E em `gerentes_pap`) precisa
  // conseguir chegar aqui de verdade: é o destino do "Minha peregrinação"
  // no menu de troca de perfil da barra superior (Navbar/AuthRoleProvider).
  // Antes esse redirecionamento era incondicional e jogava essa conta de
  // volta para "/gerente-pap" sempre, fazendo a troca de perfil nunca
  // funcionar de fato (Rodada 16).
  if (!perfil && (gerente || user.user_metadata?.tipo_conta === "gerente_pap")) {
    redirect("/gerente-pap");
  }

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

  const { data: peregrinacao } = await supabase
    .from("peregrinacoes")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["planejada", "em_andamento"])
    .order("criado_em", { ascending: false })
    .maybeSingle();

  const { data: concluidasData } = await supabase
    .from("peregrinacoes")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "concluida")
    .order("data_fim", { ascending: false });

  const { data: certificadosData } = await supabase
    .from("certificados")
    .select("id, peregrinacao_id")
    .eq("user_id", user.id);

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

  // PAPs ativos hoje (para o módulo de mapa em "Minha peregrinação") — só
  // entram os que estão marcados como ativos, aprovados e com a data de
  // hoje no calendário de funcionamento.
  const hoje = new Date();
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;
  const { data: pontosApoio } = await supabase
    .from("pontos_apoio")
    .select("*")
    .eq("ativo", true)
    .eq("status_aprovacao", "aprovado")
    .contains("datas_funcionamento", [hojeISO]);

  const { data: rotas } = await supabase.from("rotas").select("*").order("ordem");

  // Todos os pontos de check-in de todas as rotas — usados tanto para a
  // lista "Cidade de início na Dutra" do formulário de planejamento quanto,
  // já filtrados pela cidade de início escolhida, para a caminhada ativa.
  const { data: todosPontosCheckinData } = await supabase
    .from("pontos_checkin")
    .select("*")
    .order("ordem");
  const todosPontosCheckin = (todosPontosCheckinData ?? []) as PontoCheckin[];

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
    const { count } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("peregrinacao_id", peregrinacao.id);
    checkinsCount = count ?? 0;

    if (peregrinacao.rota_id) {
      const pontosRota = todosPontosCheckin.filter((p) => p.rota_id === peregrinacao.rota_id);
      const ordemInicio = peregrinacao.cidade_inicio
        ? (pontosRota.find((p) => p.cidade === peregrinacao.cidade_inicio)?.ordem ?? 1)
        : 1;
      pontosCheckin = pontosRota.filter((p) => p.ordem >= ordemInicio);

      const rotaAtual = ((rotas ?? []) as Rota[]).find((r) => r.id === peregrinacao.rota_id);
      const [{ data: todosRiscos }, { data: avisosData }] = await Promise.all([
        supabase.from("pontos_risco").select("*"),
        // RLS já filtra: só vêm avisos confirmados ou dentro da janela
        // pública de tempo (ver migration 11).
        supabase
          .from("riscos_informados")
          .select("*")
          .or(`rota_id.eq.${peregrinacao.rota_id},rota_id.is.null`)
          .order("criado_em", { ascending: false }),
      ]);
      pontosRisco = rotaAtual
        ? ((todosRiscos ?? []) as PontoRisco[]).filter((r) =>
            r.km_referencia != null
              ? kmPertenceARota(r.km_referencia, rotaAtual.slug)
              : r.rota_id === null || r.rota_id === rotaAtual.id
          )
        : [];
      avisos = (avisosData ?? []) as RiscoInformado[];
    }

    const { data: feitos } = await supabase
      .from("checkins")
      .select("ponto_checkin_id")
      .eq("peregrinacao_id", peregrinacao.id)
      .not("ponto_checkin_id", "is", null);
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
