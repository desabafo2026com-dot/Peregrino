import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PapQrCode from "@/components/PapQrCode";
import type { PontoApoio } from "@/types/database";

export default async function PapQrCodePage({ params }: { params: Promise<{ id: string }> }) {
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

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  // Rodada 68 — o QR leva à página de carimbo do PAP (informações + caderno
  // de bordo); sem o QR fixo (Migration 57 não rodada), cai na página do PAP.
  const { data: token } = await supabase.rpc("admin_token_qr_pap", { p_pap_id: id });
  const url = token ? `${origem}/carimbo/${token as string}` : `${origem}/pap/${id}`;

  return (
    <div className="mx-auto max-w-md">
      <VoltarButton href="/admin/pap" />
      <h2 className="mb-1 text-xl font-bold">QR code do PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Imprima e fixe este cartaz no próprio ponto de apoio. Ao escanear, o
        peregrino vê as informações públicas deste PAP direto no navegador e
        carimba o caderno de bordo. Para imprimir vários de uma vez (meia folha
        A4), use &quot;QR codes dos PAPs&quot; no menu.
      </p>
      <PapQrCode ponto={ponto as PontoApoio} url={url} />
    </div>
  );
}
