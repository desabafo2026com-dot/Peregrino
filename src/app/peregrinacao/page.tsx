import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PeregrinacaoClient from "./PeregrinacaoClient";
import VoltarButton from "@/components/VoltarButton";
import type { Peregrinacao, PontoApoio, PontoCheckin, Profile, Rota } from "@/types/database";

export default async function PeregrinacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/peregrinacao");

  // Contas de Gerente de PAP têm sua própria área e nunca acessam o fluxo
  // de peregrino.
  const { data: gerente } = await supabase
    .from("gerentes_pap")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (gerente || user.user_metadata?.tipo_conta === "gerente_pap") {
    redirect("/gerente-pap");
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

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

  const { data: pontosApoio } = await supabase
    .from("pontos_apoio")
    .select("*")
    .eq("ativo", true);

  const { data: rotas } = await supabase.from("rotas").select("*").order("ordem");

  let checkinsCount = 0;
  let pontosCheckin: PontoCheckin[] = [];
  let checkinsFeitosIds: string[] = [];

  if (peregrinacao) {
    const { count } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("peregrinacao_id", peregrinacao.id);
    checkinsCount = count ?? 0;

    if (peregrinacao.rota_id) {
      const { data: pc } = await supabase
        .from("pontos_checkin")
        .select("*")
        .eq("rota_id", peregrinacao.rota_id)
        .order("ordem");
      pontosCheckin = (pc ?? []) as PontoCheckin[];
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
      <h1 className="mb-1 text-2xl font-bold">Minha peregrinação</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Inicie sua caminhada, compartilhe sua localização e faça check-in nos
        pontos de apoio.
      </p>
      <PeregrinacaoClient
        perfil={perfil as Profile}
        peregrinacaoInicial={peregrinacao as Peregrinacao | null}
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        rotas={(rotas ?? []) as Rota[]}
        checkinsCount={checkinsCount}
        pontosCheckin={pontosCheckin}
        checkinsFeitosIds={checkinsFeitosIds}
      />
    </div>
  );
}
