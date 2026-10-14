import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import OcorrenciasAdminClient, { type OcorrenciaAdmin } from "./OcorrenciasAdminClient";

// Rodada 68 — análise das ocorrências na Dutra e marca de quando foi
// comunicado às autoridades. Rodada 69 — nada é publicado.
export default async function AdminOcorrenciasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const { data } = await supabase
    .from("ocorrencias_dutra")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(500);
  const lista = ((data ?? []) as OcorrenciaAdmin[]).sort(
    (a, b) => Number(a.status !== "pendente") - Number(b.status !== "pendente")
  );

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Ocorrências na Dutra</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Registros de peregrinos (de qualquer ano), só para análise da administração: nada é publicado. Marque se
        procede ou se foi descartado, e quando comunicar às autoridades.
      </p>
      <OcorrenciasAdminClient iniciais={lista} />
    </div>
  );
}
