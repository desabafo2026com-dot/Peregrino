import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import AvisoNaoEBoletim from "@/components/AvisoNaoEBoletim";
import OcorrenciaForm, { type MinhaOcorrencia } from "./OcorrenciaForm";

export const metadata = {
  title: "Registrar ocorrência na Dutra — O Peregrino",
};

// Rodada 68 — registrar uma ocorrência na Dutra de qualquer ano.
export default async function NovaOcorrenciaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/ocorrencias/nova");

  const { data: minhas } = await supabase
    .from("ocorrencias_dutra")
    .select("id, tipo, data_ocorrido, km, cidade, descricao, status")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <VoltarButton href="/ocorrencias" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <TriangleAlert size={24} className="text-red-600" /> Registrar ocorrência na Dutra
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
        Aconteceu algo na rodovia, neste ano ou em anos anteriores? Registre para que outros peregrinos tenham mais
        cuidado naquele ponto.
      </p>
      <AvisoNaoEBoletim />
      <OcorrenciaForm userId={user.id} minhasIniciais={(minhas ?? []) as MinhaOcorrencia[]} />
    </div>
  );
}
