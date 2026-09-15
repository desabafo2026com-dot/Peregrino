import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PosicaoPapClient from "./PosicaoPapClient";
import type { PontoApoio } from "@/types/database";

export default async function PosicaoPapPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: ponto } = await supabase.from("pontos_apoio").select("*").eq("id", id).maybeSingle();

  if (!ponto) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/admin/pap" />
        <p className="text-neutral-500">PAP não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin/pap" />
      <h2 className="mb-1 text-xl font-bold">Reposicionar PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Toque no mapa para marcar a localização correta de <strong>{ponto.nome}</strong> e depois
        salve. Use quando a marcação original ficou imprecisa (ex.: veio do pré-cadastro público,
        aproximada pela cidade).
      </p>
      <PosicaoPapClient ponto={ponto as PontoApoio} />
    </div>
  );
}
