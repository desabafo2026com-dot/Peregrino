import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PapQrCode from "@/components/PapQrCode";
import type { PontoApoio } from "@/types/database";

// Rodada 71 — o gerente imprime o cartaz com o QR code do seu PAP a
// qualquer momento (meia folha A4, 2 por folha).
export default async function GerentePapQrCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/gerente-pap/pap/${id}/qrcode`);

  const { data: ponto } = await supabase
    .from("pontos_apoio")
    .select("*")
    .eq("id", id)
    .eq("gerente_id", user.id)
    .maybeSingle();
  if (!ponto) redirect("/gerente-pap");

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <div className="mx-auto max-w-md">
      <VoltarButton href="/gerente-pap" />
      <h2 className="mb-1 text-xl font-bold">QR code do meu PAP</h2>
      <p className="mb-6 text-sm text-neutral-500" style={{ textAlign: "left" }}>
        Imprima e fixe no seu ponto de apoio. Ao ler o QR, o peregrino vê as informações do PAP e carimba o caderno de
        bordo. O PDF sai em meia folha A4: 2 cartazes por folha.
      </p>
      <PapQrCode ponto={ponto as PontoApoio} url={`${origem}/pap/${id}`} />
    </div>
  );
}
