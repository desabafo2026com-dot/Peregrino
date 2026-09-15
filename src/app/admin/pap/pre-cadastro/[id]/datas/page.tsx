import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import DatasPreCadastroClient from "./DatasPreCadastroClient";
import type { PapPreCadastro } from "@/types/database";

export default async function DatasPreCadastroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const { data: item } = await supabase
    .from("paps_pre_cadastro")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!item) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin/pap/pre-cadastro" />
        <p className="text-neutral-500">PAP pré-cadastrado não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin/pap/pre-cadastro" />
      <h2 className="mb-1 text-xl font-bold">Datas em que o PAP estará ativo</h2>
      <p className="mb-6 text-sm text-neutral-500">
        <strong>{item.nome}</strong> ({item.cidade ?? "cidade não informada"}) — texto original da
        fonte: &quot;{item.data_funcionamento_texto ?? "sem informação"}&quot;. Marque o calendário
        abaixo; só nessas datas este ponto aparece como ativo no mapa e na contagem da home.
      </p>
      <DatasPreCadastroClient item={item as PapPreCadastro} />
    </div>
  );
}
