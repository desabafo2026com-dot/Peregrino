import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import AchadosAdminClient, { type AnuncioAdmin } from "./AchadosAdminClient";

// Rodada 68 — moderação dos achados e perdidos (ocultar o que for
// inadequado). Publicam na hora, sem revisão prévia.
export default async function AdminAchadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const { data } = await supabase
    .from("achados_perdidos")
    .select("id, tipo, titulo, descricao, local_texto, contato, nome, cidade, status, ativo, criado_em, expira_em")
    .order("criado_em", { ascending: false })
    .limit(500);

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Achados e perdidos</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Publicam na hora. Oculte aqui o que for inadequado. Cada anúncio vence sozinho em 60 dias.
      </p>
      <AchadosAdminClient iniciais={(data ?? []) as AnuncioAdmin[]} />
    </div>
  );
}
