import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import ComercioQrCode from "./ComercioQrCode";
import type { PontoComercial } from "@/types/database";

// Rodada 71 — QR code de hotel/restaurante, criado ao cadastrar (e
// disponível na lista): leva à página pública do estabelecimento.
export default async function ComercioQrCodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { id } = await params;
  const { novo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const { data } = await supabase.from("pontos_comerciais").select("*").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/hospedagem");

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <div className="mx-auto max-w-md">
      <VoltarButton href="/admin/hospedagem" />
      {novo && <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">Cadastrado! O QR code já está pronto.</p>}
      <h2 className="mb-1 text-xl font-bold">QR code do estabelecimento</h2>
      <p className="mb-6 text-sm text-neutral-500" style={{ textAlign: "left" }}>
        Imprima e entregue ao estabelecimento. Ao ler o QR, o peregrino vê as informações dele no app. O PDF sai em
        meia folha A4: 2 cartazes por folha.
      </p>
      <ComercioQrCode comercio={data as PontoComercial} url={`${origem}/hospedagem/${id}`} />
    </div>
  );
}
