import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import GerentePapClient from "./GerentePapClient";
import TambemPeregrinoCheck from "@/components/TambemPeregrinoCheck";
import type { GerentePap, PontoApoio, PapTransferencia } from "@/types/database";

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

  // A conta do gerente não precisa mais de aprovação prévia para usar a
  // área (só a divulgação de cada PAP no mapa é que fica pendente de
  // aprovação — ver status_aprovacao em pontos_apoio) — por isso os PAP já
  // cadastrados são buscados sempre, independente do status da conta. Antes
  // essa busca só acontecia com `status === "aprovado"`, o que fazia contas
  // de gerente antigas (criadas quando a conta ainda pedia aprovação, e por
  // isso ainda com status "pendente") verem sempre a tela inicial de
  // cadastro, mesmo já tendo PAP cadastrado.
  const { data } = await supabase
    .from("pontos_apoio")
    .select("*")
    .eq("gerente_id", user.id)
    .order("criado_em", { ascending: false });
  const pontos = (data ?? []) as PontoApoio[];

  // Rodada 23: o caminho inverso (peregrino que também vira gerente, em
  // /gerente-pap/cadastro) já existia desde a Rodada 2 — mas não havia
  // nenhum link, em lugar nenhum do app, para uma conta que começou como
  // gerente ganhar acesso a "Minha peregrinação" com a mesma conta. A pessoa
  // teria que criar uma conta nova do zero, o que nem funciona de verdade
  // (o e-mail já existe). Este link resolve isso: leva a /peregrinacao, que
  // agora aceita uma conta só-gerente e pede para completar o perfil de
  // peregrino ali mesmo, sem precisar de outro cadastro.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  // Rodada 38 — pedidos de outros gerentes querendo assumir um PAP que hoje
  // está vinculado a esta conta (ver solicitar_transferencia_pap). Só os
  // pendentes: uma vez aceito ou negado, o pedido sai desta lista.
  const { data: transferenciasRecebidas } = await supabase
    .from("pap_transferencias")
    .select("*")
    .eq("gerente_atual_id", user.id)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/" />
      <h1 className="mb-1 text-2xl font-bold">Área do Gerente de PAP</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Vincule ou cadastre seu Ponto de Apoio ao Peregrino — ele fica
        pendente até um administrador aprovar a divulgação no mapa.
      </p>
      <GerentePapClient
        gerente={gerente as GerentePap}
        pontosIniciais={pontos}
        transferenciasRecebidasIniciais={(transferenciasRecebidas ?? []) as PapTransferencia[]}
      />
      <TambemPeregrinoCheck gerente={gerente as GerentePap} temPerfil={!!perfil} />
    </div>
  );
}
