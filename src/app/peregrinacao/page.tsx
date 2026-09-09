import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PeregrinacaoClient from "./PeregrinacaoClient";
import type { Peregrinacao, PontoApoio, Profile } from "@/types/database";

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

  if (!perfil) {
    return (
      <div className="mx-auto max-w-md text-center">
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

  let checkinsCount = 0;
  if (peregrinacao) {
    const { count } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("peregrinacao_id", peregrinacao.id);
    checkinsCount = count ?? 0;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Minha peregrinação</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Inicie sua caminhada, compartilhe sua localização e faça check-in nos
        pontos de apoio.
      </p>
      <PeregrinacaoClient
        perfil={perfil as Profile}
        peregrinacaoInicial={peregrinacao as Peregrinacao | null}
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        checkinsCount={checkinsCount}
      />
    </div>
  );
}
