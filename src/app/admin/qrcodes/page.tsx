import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import QrCodesPapsClient, { type QrPap } from "./QrCodesPapsClient";

// Rodada 68 — QR code fixo de cada PAP (aprovados e pré-cadastrados), para
// imprimir em meia folha A4 (2 por folha), escolhendo quais na lista.
export default async function AdminQrCodesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const { data, error } = await supabase.rpc("admin_qr_paps");

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">QR codes e carimbos dos PAPs</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Cada PAP já tem o seu QR code fixo (os novos ganham na hora em que são cadastrados). Escolha na lista e gere o
        PDF para imprimir: 2 por folha A4 (meia folha cada). Ao ler o QR, o peregrino vê o PAP e carimba o caderno de
        bordo. Se um gerente vincular um PAP pré-cadastrado, o QR já impresso continua valendo. Em &quot;Carimbo&quot; você vê
        como fica o carimbo virtual de cada PAP e pode trocar por uma imagem própria.
      </p>
      {error ? (
        <p className="card text-sm text-red-600">Não foi possível carregar os QR codes. A Migration 57 já foi rodada?</p>
      ) : (
        <QrCodesPapsClient lista={(data ?? []) as QrPap[]} />
      )}
    </div>
  );
}
