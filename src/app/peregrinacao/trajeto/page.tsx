import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import TrajetoClient from "./TrajetoClient";
import { nomeRota, kmPertenceARota, avisoVisivelPublicamente } from "@/lib/constants";
import type { Peregrinacao, PontoCheckin, PontoRisco, RiscoInformado, Rota } from "@/types/database";

export default async function TrajetoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/peregrinacao/trajeto");

  const { data: peregrinacao } = await supabase
    .from("peregrinacoes")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["planejada", "em_andamento"])
    .order("criado_em", { ascending: false })
    .maybeSingle();

  if (!peregrinacao || !peregrinacao.rota_id) {
    redirect("/peregrinacao");
  }

  const [{ data: rota }, { data: pontosCheckinRota }, { data: todosRiscos }, { data: avisos }, { data: feitos }] =
    await Promise.all([
      supabase.from("rotas").select("*").eq("id", peregrinacao.rota_id).maybeSingle(),
      supabase.from("pontos_checkin").select("*").eq("rota_id", peregrinacao.rota_id).order("ordem"),
      // Busca todos os pontos de risco (não só os da rota_id atual) para
      // decidir a associação com a rota pelo km real (ver kmPertenceARota),
      // não só pela rota_id escolhida no cadastro.
      supabase.from("pontos_risco").select("*"),
      // A RLS sozinha não filtra isto de verdade para uma conta de admin
      // (ou para a própria autora de um relato antigo) — ver o comentário
      // equivalente, mais detalhado, em src/app/peregrinacao/page.tsx.
      // `avisoVisivelPublicamente` reaplica a regra de visibilidade aqui no
      // app (Rodada 21).
      supabase
        .from("riscos_informados")
        .select("*")
        .or(`rota_id.eq.${peregrinacao.rota_id},rota_id.is.null`)
        .order("criado_em", { ascending: false }),
      supabase
        .from("checkins")
        .select("ponto_checkin_id")
        .eq("peregrinacao_id", peregrinacao.id)
        .not("ponto_checkin_id", "is", null),
    ]);

  const riscos = rota
    ? ((todosRiscos ?? []) as PontoRisco[]).filter((r) =>
        r.km_referencia != null
          ? kmPertenceARota(r.km_referencia, (rota as Rota).slug)
          : r.rota_id === null || r.rota_id === (rota as Rota).id
      )
    : [];

  const checkinsFeitosIds = (feitos ?? [])
    .map((f) => f.ponto_checkin_id as string | null)
    .filter((v): v is string => !!v);

  // Só mostra check-ins entre a cidade de início escolhida (se houver) e o
  // destino da rota — quem começa a caminhada mais adiante na Dutra (ex.:
  // Taubaté) não precisa ver nem fazer check-in nas cidades anteriores.
  const todosPontos = (pontosCheckinRota ?? []) as PontoCheckin[];
  const ordemInicio = peregrinacao.cidade_inicio
    ? (todosPontos.find((p) => p.cidade === peregrinacao.cidade_inicio)?.ordem ?? 1)
    : 1;
  const pontosCheckin = todosPontos.filter((p) => p.ordem >= ordemInicio);

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/peregrinacao" label="Voltar à peregrinação" />
      <h1 className="mb-1 text-2xl font-bold">Trajeto — {nomeRota(rota as Rota | null)}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Um ponto de check-in seguro por cidade, riscos conhecidos no trajeto e
        seu progresso até agora.
      </p>
      <TrajetoClient
        peregrinacao={peregrinacao as Peregrinacao}
        pontosCheckin={pontosCheckin}
        checkinsFeitosIdsIniciais={checkinsFeitosIds}
        riscos={(riscos ?? []) as PontoRisco[]}
        avisos={((avisos ?? []) as RiscoInformado[]).filter(avisoVisivelPublicamente)}
        rota={rota as Rota | null}
      />
    </div>
  );
}
