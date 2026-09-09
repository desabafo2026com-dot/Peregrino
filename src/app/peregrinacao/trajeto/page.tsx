import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import TrajetoClient from "./TrajetoClient";
import type { Peregrinacao, PontoCheckin, PontoRisco, Rota, TrechoSeguranca } from "@/types/database";

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

  const [{ data: rota }, { data: pontosCheckin }, { data: trechos }, { data: riscos }, { data: feitos }] =
    await Promise.all([
      supabase.from("rotas").select("*").eq("id", peregrinacao.rota_id).maybeSingle(),
      supabase.from("pontos_checkin").select("*").eq("rota_id", peregrinacao.rota_id).order("ordem"),
      supabase
        .from("trechos_seguranca")
        .select("*")
        .eq("rota_id", peregrinacao.rota_id)
        .order("km_inicial"),
      supabase
        .from("pontos_risco")
        .select("*")
        .or(`rota_id.eq.${peregrinacao.rota_id},rota_id.is.null`),
      supabase
        .from("checkins")
        .select("ponto_checkin_id")
        .eq("peregrinacao_id", peregrinacao.id)
        .not("ponto_checkin_id", "is", null),
    ]);

  const checkinsFeitosIds = (feitos ?? [])
    .map((f) => f.ponto_checkin_id as string | null)
    .filter((v): v is string => !!v);

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/peregrinacao" label="Voltar à peregrinação" />
      <h1 className="mb-1 text-2xl font-bold">Trajeto — {rota?.nome ?? ""}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {rota ? `${rota.origem} → ${rota.destino}. ` : ""}
        Um ponto de check-in seguro por cidade, riscos conhecidos no trajeto e
        seu progresso até agora.
      </p>
      <TrajetoClient
        peregrinacao={peregrinacao as Peregrinacao}
        pontosCheckin={(pontosCheckin ?? []) as PontoCheckin[]}
        checkinsFeitosIdsIniciais={checkinsFeitosIds}
        trechos={(trechos ?? []) as TrechoSeguranca[]}
        riscos={(riscos ?? []) as PontoRisco[]}
        rota={rota as Rota | null}
      />
    </div>
  );
}
