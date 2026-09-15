import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CertificadoGratuitoView from "@/components/CertificadoGratuitoView";
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
        const pago = compra?.status === "pago";
        return (
          <div key={c.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-amber-800 dark:text-amber-500">Certificado</h2>
              <a
                href={`#romaria-plus-${c.id}`}
                className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline dark:text-amber-500"
              >
                <Sparkles size={14} /> Certificado Plus →
              </a>
            </div>
            {/* Grátis, sempre disponível para quem concluiu a peregrinação —
                sem a arte de pergaminho, que agora é exclusiva de quem compra
                a Romaria Plus (ver "Certificado Plus" abaixo). */}
            <CertificadoGratuitoView certificado={c} />

            <div id={`romaria-plus-${c.id}`} className="mt-2 flex scroll-mt-6 flex-col gap-4 border-t border-dashed border-amber-200 pt-6 dark:border-amber-900">
              <h2 className="text-center text-lg font-bold text-amber-800 dark:text-amber-500">Certificado Plus</h2>
              {pago && compra ? (
                <>
                  <CertificadoView certificado={c} />
                  <RomariaPlusView
                    certificado={c}
                    compraId={compra.id}
                    userId={user.id}
                    fotoUrlInicial={compra.foto_url}
                    modeloInicial={compra.modelo}
                  />
                </>
              ) : (
                <RomariaPlusCompra certificadoId={c.id} compraInicial={compra} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
