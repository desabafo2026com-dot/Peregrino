import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import { STATUS_PAP_LABELS } from "@/lib/constants";
import EditarPapAdminClient from "./EditarPapAdminClient";
import type { PontoApoio } from "@/types/database";

// Rodada 43 — a pedido do usuário: a administração pode editar qualquer PAP
// (os mesmos campos que o gerente edita em /gerente-pap/pap/[id]/editar),
// para ajudar gerentes com dificuldade de usar o app. A RLS já permite
// (pontos_apoio_update_admin_ou_gerente: admin atualiza qualquer linha);
// a foto enviada aqui vai para a pasta do próprio admin no bucket
// pap-fotos, como a política de storage exige. Só administradores —
// agentes são mandados de volta ao painel, igual às outras telas de PAP.
export default async function EditarPapAdminPage({ params }: { params: Promise<{ id: string }> }) {
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

  const pap = ponto as PontoApoio;
  const { data: gerente } = pap.gerente_id
    ? await supabase
        .from("gerentes_pap")
        .select("nome_completo, telefone")
        .eq("id", pap.gerente_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/admin/pap" />
      <h2 className="mb-1 text-xl font-bold">Editar PAP</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Ajuste os dados de <strong>{pap.nome}</strong> em nome do gerente. As alterações aparecem na
        hora no mapa e o gerente continua podendo editar normalmente pela área dele.
      </p>
      <div className="card mb-6 flex flex-col gap-1 text-sm">
        <p>
          <span className="text-neutral-500">Situação: </span>
          <strong>{STATUS_PAP_LABELS[pap.status_aprovacao] ?? pap.status_aprovacao}</strong>
        </p>
        <p>
          <span className="text-neutral-500">Gerente responsável: </span>
          {gerente ? (
            <>
              <strong>{gerente.nome_completo}</strong>
              {gerente.telefone ? ` — ${gerente.telefone}` : ""}
            </>
          ) : (
            <strong>nenhum (cadastrado pela administração)</strong>
          )}
        </p>
      </div>
      <EditarPapAdminClient ponto={pap} />
    </div>
  );
}
