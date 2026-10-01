import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CertificadoGratuitoView from "@/components/CertificadoGratuitoView";
import CertificadoView from "@/components/CertificadoView";
import RomariaPlusCompra from "@/components/RomariaPlusCompra";
import MensagemConquistaForm from "@/components/MensagemConquistaForm";
import VoltarButton from "@/components/VoltarButton";
import type { Certificado, CompraRomariaPlus, MensagemConquista } from "@/types/database";

// Rodada 60 — página de UM certificado: o certificado, o Certificado Plus
// (ou a opção de adquirir) e a mensagem de conquista.
export default async function CertificadoDetalhePage({ params }: { params: Promise<{ certificadoId: string }> }) {
  const { certificadoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/certificado/${certificadoId}`);

  const { data: certificado } = await supabase
    .from("certificados")
    .select("*")
    .eq("id", certificadoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!certificado) redirect("/certificado");
  const c = certificado as Certificado;

  const [{ data: perfil }, { data: compras }, { data: mensagem }, { data: peregrinacao }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    supabase
      .from("compras_romaria_plus")
      .select("*")
      .eq("certificado_id", c.id)
      .eq("tipo", "inicial")
      .order("criado_em", { ascending: false })
      .limit(1),
    supabase.from("mensagens_conquista").select("*").eq("certificado_id", c.id).maybeSingle(),
    supabase.from("peregrinacoes").select("cidade_origem, cidade_inicio").eq("id", c.peregrinacao_id).maybeSingle(),
  ]);

  const compra = ((compras ?? []) as CompraRomariaPlus[])[0] ?? null;
  const pago = compra?.status === "pago";
  const comOrigem: Certificado = {
    ...c,
    origem: c.origem ?? peregrinacao?.cidade_origem ?? peregrinacao?.cidade_inicio ?? null,
  };
  const ano = new Date(c.data_fim ?? c.emitido_em).toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <VoltarButton href="/certificado" label="Meus certificados" />
      <div>
        <h1 className="text-2xl font-bold">Certificado {ano}</h1>
        <p className="text-sm text-neutral-500">
          {comOrigem.origem ? `${comOrigem.origem} → Aparecida-SP` : "Peregrinação até Aparecida-SP"}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-500">Certificado</h2>
        <CertificadoGratuitoView certificado={comOrigem} />
      </section>

      <section
        id="romaria-plus"
        className="flex scroll-mt-6 flex-col gap-4 border-t border-dashed border-amber-200 pt-6 dark:border-amber-900"
      >
        <h2 className="text-center text-lg font-bold text-amber-800 dark:text-amber-500">Certificado Plus</h2>
        {pago && compra ? (
          <>
            <CertificadoView certificado={comOrigem} />
            <Link
              href={`/certificado/plus/${c.id}`}
              className="card flex items-center justify-center gap-2 text-center font-semibold text-amber-800 transition hover:border-amber-300 dark:text-amber-500"
            >
              <Sparkles size={18} /> Minhas fotos da Romaria Plus →
            </Link>
          </>
        ) : (
          <RomariaPlusCompra certificadoId={c.id} compraInicial={compra} isAdmin={!!perfil?.is_admin} />
        )}
      </section>

      <MensagemConquistaForm
        certificadoId={c.id}
        userId={user.id}
        nome={c.nome_peregrino.trim().split(/\s+/)[0]}
        cidade={comOrigem.origem}
        mensagemInicial={(mensagem as MensagemConquista | null) ?? null}
      />
    </div>
  );
}
