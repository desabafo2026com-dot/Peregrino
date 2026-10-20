import { cidadeDoCheckin } from "@/lib/caderno-checkins";
import { cidadesParaArte } from "@/lib/cidades-arte";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import Link from "next/link";
import { Award } from "lucide-react";
import RomariaPlusFotos from "@/components/RomariaPlusFotos";
import RomariaPlusCompra from "@/components/RomariaPlusCompra";
import type { Certificado, CompraRomariaPlus, RomariaPlusFoto } from "@/types/database";

// Página separada (Rodada 18) para quem já pagou a Romaria Plus — antes a
// arte/editor de foto ficava embutida direto na página do certificado
// grátis; agora fica no seu próprio espaço, com as até 5 fotos da pessoa.
export default async function CertificadoPlusPage({ params }: { params: Promise<{ certificadoId: string }> }) {
  const { certificadoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/certificado/plus/${certificadoId}`);

  const { data: certificado } = await supabase
    .from("certificados")
    .select("*")
    .eq("id", certificadoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!certificado) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/certificado" />
        <p className="text-neutral-500">Certificado não encontrado.</p>
      </div>
    );
  }

  // tipo="inicial" (Rodada 30): sem esse filtro, uma compra de PACOTE EXTRA
  // (também "pago", criada depois) poderia ser a mais recente e virar "a"
  // compra — só que a galeria de fotos sempre fica presa na compra inicial
  // (romaria_plus_fotos.compra_id nunca aponta pra uma compra extra).
  const { data: compra } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .eq("certificado_id", certificadoId)
    .eq("status", "pago")
    .eq("tipo", "inicial")
    .order("criado_em", { ascending: false })
    .maybeSingle();

  // Rodada 61 — sem a Romaria Plus paga, mas com a arte grátis liberada
  // para este certificado: abre o editor com espaço para 1 foto.
  const { data: cortesia } = compra
    ? { data: null }
    : await supabase
        .from("compras_romaria_plus")
        .select("*")
        .eq("certificado_id", certificadoId)
        .eq("user_id", user.id)
        .eq("status", "pago")
        .eq("tipo", "cortesia")
        .maybeSingle();

  // Sem compra paga (ainda não comprou, cancelou, ou por algum motivo caiu
  // aqui sem concluir) — volta para a tela de compra em vez de mostrar uma
  // página vazia, como pedido pelo usuário.
  if (!compra && !cortesia) {
    redirect(`/certificado/${certificadoId}#romaria-plus`);
  }

  const ehCortesia = !compra;
  const compraId = ((compra ?? cortesia) as CompraRomariaPlus).id;

  // As duas consultas abaixo dependem só de compraId, não uma da outra —
  // juntas num só Promise.all (Rodada 30, mesma otimização de
  // /peregrinacao e /certificado).
  const cert = certificado as Certificado;
  const [
    { data: fotos },
    { data: pacotesExtra },
    { data: peregrinacao },
    { data: checkinsCidades },
    { data: perfilLogado },
  ] = await Promise.all([
    supabase.from("romaria_plus_fotos").select("*").eq("compra_id", compraId).order("indice"),
    // Pacotes extra de +5 fotos (Rodada 30) — quantos já foram pagos
    // (define o limite atual da galeria) e o mais recente ainda pendente,
    // se houver (para mostrar "confirmando pagamento..." ao voltar do
    // Mercado Pago).
    supabase
      .from("compras_romaria_plus")
      .select("*")
      .eq("compra_pai_id", compraId)
      .eq("tipo", "extra")
      .order("criado_em", { ascending: false }),
    // Rodada 49 — origem da própria peregrinação, para certificados antigos
    // que não gravaram a origem (a arte mostrava só "Início"), e as cidades
    // com check-in, na ordem, para os carimbos da "Credencial do peregrino".
    supabase.from("peregrinacoes").select("cidade_origem, cidade_inicio").eq("id", cert.peregrinacao_id).maybeSingle(),
    supabase
      .from("checkins")
      .select("criado_em, cidade, pontos_checkin(cidade)")
      .eq("peregrinacao_id", cert.peregrinacao_id)
      .order("criado_em", { ascending: true }),
    // Rodada 54 — o modelo "Basílica" só aparece para administradores.
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
  ]);

  const certificadoComOrigem: Certificado = {
    ...cert,
    origem: cert.origem ?? peregrinacao?.cidade_origem ?? peregrinacao?.cidade_inicio ?? null,
  };
  // Rodada 76 — inclui os check-ins automáticos por cidade e, na arte,
  // deixa só as 4 cidades maiores entre o início e a chegada.
  const cidadesCheckin = cidadesParaArte(
    ((checkinsCidades ?? []) as { cidade: string | null; pontos_checkin: unknown }[])
      .map((c) => cidadeDoCheckin(c.pontos_checkin, c.cidade))
      .filter((cidade): cidade is string => !!cidade),
    certificadoComOrigem.origem ?? null
  );

  const listaPacotesExtra = (pacotesExtra ?? []) as CompraRomariaPlus[];
  const pacotesExtraPagos = listaPacotesExtra.filter((p) => p.status === "pago").length;
  const pacoteExtraPendente = listaPacotesExtra.find((p) => p.status === "pendente") ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <VoltarButton href="/painel" />
      <div>
        <h1 className="mb-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
          {ehCortesia ? "Minha arte grátis" : "Minhas fotos — Romaria Plus"}
        </h1>
        <p className="text-sm text-neutral-500">
          {ehCortesia
            ? "Escolha uma foto da sua caminhada e um modelo. A primeira arte é por nossa conta!"
            : "Transforme suas fotos desta peregrinação em artes prontas para baixar ou compartilhar."}
        </p>
        {/* Rodada 57 — o Certificado Plus (pergaminho) mudou para Meus certificados. */}
        {!ehCortesia && (
          <Link
            href={`/certificado/${cert.id}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline dark:text-amber-500"
          >
            <Award size={15} /> Ver meu Certificado Plus em Meus certificados →
          </Link>
        )}
      </div>
      <RomariaPlusFotos
        certificado={certificadoComOrigem}
        cidadesCheckin={cidadesCheckin}
        ehAdmin={!!perfilLogado?.is_admin}
        compraId={compraId}
        userId={user.id}
        fotosIniciais={(fotos ?? []) as RomariaPlusFoto[]}
        pacotesExtraPagos={pacotesExtraPagos}
        pacoteExtraPendente={pacoteExtraPendente}
        cortesia={ehCortesia}
      />
      {ehCortesia && (
        <section className="flex flex-col gap-3 border-t border-dashed border-amber-200 pt-6 dark:border-amber-900">
          <h2 className="text-center text-lg font-bold text-amber-800 dark:text-amber-500">Gostou? Faça mais 4</h2>
          <RomariaPlusCompra
            certificadoId={cert.id}
            compraInicial={null}
            isAdmin={!!perfilLogado?.is_admin}
            arteGratis="usada_aqui"
            mostrarLinkArteGratis={false}
          />
        </section>
      )}
    </div>
  );
}
