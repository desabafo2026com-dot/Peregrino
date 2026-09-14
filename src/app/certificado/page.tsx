import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CertificadoView from "@/components/CertificadoView";
import RomariaPlusView from "@/components/RomariaPlusView";
import RomariaPlusCompra from "@/components/RomariaPlusCompra";
import VoltarButton from "@/components/VoltarButton";
import type { Certificado, CompraRomariaPlus } from "@/types/database";

export default async function CertificadoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/certificado");

  const { data: certificados } = await supabase
    .from("certificados")
    .select("*")
    .eq("user_id", user.id)
    .order("emitido_em", { ascending: false });

  if (!certificados?.length) {
    return (
      <div className="mx-auto max-w-md text-center text-neutral-500">
        <VoltarButton href="/peregrinacao" />
        <p>
          Você ainda não concluiu nenhuma peregrinação. Ao finalizar, o
          certificado aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  const certificadosLista = certificados as Certificado[];

  // Última compra de Romaria Plus conhecida por certificado (se houver
  // mais de uma tentativa, a mais recente é a que importa).
  const { data: compras } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .in(
      "certificado_id",
      certificadosLista.map((c) => c.id)
    )
    .order("criado_em", { ascending: false });

  const compraPorCertificado = new Map<string, CompraRomariaPlus>();
  ((compras ?? []) as CompraRomariaPlus[]).forEach((compra) => {
    if (!compraPorCertificado.has(compra.certificado_id)) {
      compraPorCertificado.set(compra.certificado_id, compra);
    }
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <VoltarButton href="/peregrinacao" />
      <h1 className="text-2xl font-bold">Meus certificados</h1>
      {certificadosLista.map((c) => {
        const compra = compraPorCertificado.get(c.id) ?? null;
        return (
          <div key={c.id} className="flex flex-col gap-4">
            <CertificadoView certificado={c} />
            {compra?.status === "pago" ? (
              <RomariaPlusView certificado={c} />
            ) : (
              <RomariaPlusCompra certificadoId={c.id} compraInicial={compra} />
            )}
          </div>
        );
      })}
    </div>
  );
}
