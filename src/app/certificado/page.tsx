import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CertificadoView from "@/components/CertificadoView";
import type { Certificado } from "@/types/database";

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
        <p>
          Você ainda não concluiu nenhuma peregrinação. Ao finalizar, o
          certificado aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-bold">Meus certificados</h1>
      {(certificados as Certificado[]).map((c) => (
        <CertificadoView key={c.id} certificado={c} />
      ))}
    </div>
  );
}
