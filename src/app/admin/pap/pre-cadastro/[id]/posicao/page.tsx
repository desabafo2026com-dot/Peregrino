import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PosicaoPreCadastroClient from "./PosicaoPreCadastroClient";
import type { PapPreCadastro } from "@/types/database";

export default async function PosicaoPreCadastroPage({ params }: { params: Promise<{ id: string }> }) {
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
      <h2 className="mb-1 text-xl font-bold">Marcar posição do PAP pré-cadastrado</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Toque no mapa para marcar a localização de <strong>{item.nome}</strong> ({item.cidade ?? "cidade não informada"})
        e depois salve. Enquanto não vinculado a um gerente, essa posição é o que aparece no mapa
        público em vez da aproximação por cidade.
      </p>
      <PosicaoPreCadastroClient item={item as PapPreCadastro} />
    </div>
  );
}
