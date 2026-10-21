import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import EditarPreCadastroClient from "./EditarPreCadastroClient";
import type { PapPreCadastro } from "@/types/database";

// Rodada 78 — a administração corrige os dados de um PAP pré-cadastrado
// que ainda não tem gerente (nome, cidade, rodovia, km, sentido e o texto
// das datas). Posição no mapa e calendário continuam nas suas páginas.
export default async function EditarPreCadastroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const { data: item } = await supabase.from("paps_pre_cadastro").select("*").eq("id", id).maybeSingle();
  if (!item) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin/pap/pre-cadastro" />
        <p className="text-neutral-500">PAP pré-cadastrado não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <VoltarButton href="/admin/pap/pre-cadastro" />
      <h2 className="mb-1 text-xl font-bold">Editar PAP pré-cadastrado</h2>
      <p className="mb-6 text-sm text-neutral-500" style={{ textAlign: "left" }}>
        As mudanças aparecem no mapa, na lista de PAPs, no cartaz e no carimbo do QR code deste PAP.
      </p>
      <EditarPreCadastroClient item={item as PapPreCadastro} />
    </div>
  );
}
