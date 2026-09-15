import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import CertificadoView from "@/components/CertificadoView";
import RomariaPlusFotos from "@/components/RomariaPlusFotos";
import type { Certificado, CompraRomariaPlus, RomariaPlusFoto } from "@/types/database";

// Página separada (Rodada 18) para quem já pagou a Romaria Plus — antes a
// arte/editor de foto ficava embutida direto na página do certificado
// grátis; agora fica no seu próprio espaço, com as até 5 fotos da pessoa.
export default async function CertificadoPlusPage({
  params,
}: {
  params: Promise<{ certificadoId: string }>;
}) {
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

  const { data: compra } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .eq("certificado_id", certificadoId)
    .eq("status", "pago")
    .order("criado_em", { ascending: false })
    .maybeSingle();

  // Sem compra paga (ainda não comprou, cancelou, ou por algum motivo caiu
  // aqui sem concluir) — volta para a tela de compra em vez de mostrar uma
  // página vazia, como pedido pelo usuário.
  if (!compra) {
    redirect(`/certificado#romaria-plus-${certificadoId}`);
  }

  const { data: fotos } = await supabase
    .from("romaria_plus_fotos")
    .select("*")
    .eq("compra_id", (compra as CompraRomariaPlus).id)
    .order("indice");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <VoltarButton href="/certificado" />
      <div>
        <h1 className="mb-1 text-2xl font-bold text-amber-800 dark:text-amber-500">Certificado Plus</h1>
        <p className="text-sm text-neutral-500">
          Sua arte de pergaminho e até 5 fotos personalizadas desta peregrinação, prontas para baixar
          ou compartilhar.
        </p>
      </div>
      <CertificadoView certificado={certificado as Certificado} />
      <RomariaPlusFotos
        certificado={certificado as Certificado}
        compraId={(compra as CompraRomariaPlus).id}
        userId={user.id}
        fotosIniciais={(fotos ?? []) as RomariaPlusFoto[]}
      />
    </div>
  );
}
