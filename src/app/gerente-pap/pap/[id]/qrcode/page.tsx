import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import PapQrCode from "@/components/PapQrCode";
import GerenteCarimboPap from "./GerenteCarimboPap";
import { Stamp } from "lucide-react";
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

  // Rodada 77 — carimbo virtual do PAP (Migration 65).
  const { data: carimboInfo } = await supabase.rpc("carimbo_do_meu_pap", { p_pap_id: id });
  const carimbo = carimboInfo as { token: string; carimbo_url: string | null } | null;
  const p = ponto as PontoApoio;

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
      <PapQrCode ponto={p} url={`${origem}/pap/${id}`} />

      <section className="card mt-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
          <Stamp size={20} /> Carimbo virtual do meu PAP
        </h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
          É o carimbo que o peregrino recebe no caderno de bordo ao ler o seu QR code. Se o seu PAP tem um carimbo de
          verdade, carimbe numa folha branca e tire uma foto; ou escolha uma imagem (logo, desenho). O app transforma em
          carimbo.
        </p>
        {carimbo ? (
          <GerenteCarimboPap
            papId={id}
            userId={user.id}
            token={carimbo.token}
            urlAtual={carimbo.carimbo_url}
            nome={p.nome}
            cidade={p.cidade}
            km={p.km_referencia}
          />
        ) : (
          <p className="text-sm text-neutral-500" style={{ textAlign: "left" }}>
            O carimbo fica disponível depois que a administração rodar a atualização do sistema (Migration 65).
          </p>
        )}
      </section>
    </div>
  );
}
