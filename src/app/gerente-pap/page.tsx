import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import GerentePapClient from "./GerentePapClient";
import { STATUS_GERENTE_LABELS } from "@/lib/constants";
import type { GerentePap, PontoApoio } from "@/types/database";

export default async function GerentePapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/gerente-pap");

  let { data: gerente } = await supabase
    .from("gerentes_pap")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Se ela se cadastrou com e-mail/senha e precisou confirmar o e-mail antes
  // de logar, o registro de gerente ainda não existia — criamos agora, com
  // os dados que ficaram guardados no cadastro (metadata do usuário).
  if (!gerente && user.user_metadata?.tipo_conta === "gerente_pap") {
    const { data: novoGerente } = await supabase
      .from("gerentes_pap")
      .insert({
        id: user.id,
        nome_completo: (user.user_metadata.nome_completo as string) ?? "",
        telefone: (user.user_metadata.telefone as string) ?? "",
        nome_organizacao: (user.user_metadata.nome_organizacao as string) ?? null,
      })
      .select()
      .maybeSingle();
    gerente = novoGerente;
  }

  if (!gerente) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/" />
        <p className="mb-4 text-neutral-600 dark:text-neutral-300">
          Você ainda não fez o cadastro de Gerente de PAP.
        </p>
        <Link href="/gerente-pap/cadastro" className="btn-primary inline-block">
          Fazer cadastro
        </Link>
      </div>
    );
  }

  let pontos: PontoApoio[] = [];
  if (gerente.status === "aprovado") {
    const { data } = await supabase
      .from("pontos_apoio")
      .select("*")
      .eq("gerente_id", user.id)
      .order("criado_em", { ascending: false });
    pontos = (data ?? []) as PontoApoio[];
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">Área do Gerente de PAP</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Status do seu cadastro:{" "}
        <span className="font-semibold text-amber-700 dark:text-amber-500">
          {STATUS_GERENTE_LABELS[gerente.status]}
        </span>
      </p>
      <GerentePapClient gerente={gerente as GerentePap} pontosIniciais={pontos} />
    </div>
  );
}
