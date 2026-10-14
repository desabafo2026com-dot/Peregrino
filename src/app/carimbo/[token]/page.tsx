import Link from "next/link";
import Image from "next/image";
import { Tent, MapPin, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CarimbarAgora from "./CarimbarAgora";
import { BR_LABELS, SENTIDO_PISTA_LABELS } from "@/lib/constants";

export const metadata = {
  title: "Carimbo do PAP — O Peregrino",
};

interface DadosQr {
  token: string;
  nome: string | null;
  cidade: string | null;
  km: number | null;
  br: string | null;
  sentido_pista: string | null;
  pap_id: string | null;
}

// Rodada 68 — destino do QR code fixado em cada PAP. Mostra o PAP e, para
// quem está com a peregrinação em andamento, carimba o caderno de bordo.
export default async function CarimboPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("qr_pap_dados", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const d = data as DadosQr | null;

  if (!d) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Info className="mx-auto mb-3 text-neutral-400" size={32} />
        <p className="text-neutral-500">Este QR code não foi encontrado.</p>
        <Link href="/mapa" className="btn-secondary mt-4 inline-block">
          Ver mapa de apoio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="card flex flex-col items-center gap-2 text-center">
        <Image src="/icons/logo-emblema.png" alt="" width={56} height={56} className="h-14 w-14 rounded-xl" />
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-green-700 uppercase dark:text-green-500">
          <Tent size={14} /> Ponto de Apoio ao Peregrino
        </p>
        <h1 className="text-xl font-bold" style={{ textAlign: "center" }}>
          {d.nome ?? "PAP"}
        </h1>
        <p className="flex items-center justify-center gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          <MapPin size={14} />
          {d.cidade ?? "cidade não informada"}
          {d.br ? ` — ${BR_LABELS[d.br] ?? d.br}` : ""}
          {d.km != null ? ` km ${d.km}` : ""}
          {d.sentido_pista ? ` (${SENTIDO_PISTA_LABELS[d.sentido_pista] ?? ""})` : ""}
        </p>
      </div>

      <CarimbarAgora token={d.token} logado={!!auth.user} />

      {d.pap_id && (
        <Link href={`/pap/${d.pap_id}`} className="btn-secondary text-center">
          Ver tudo o que este PAP oferece
        </Link>
      )}
      <Link href="/mapa" className="text-center text-sm text-amber-700 underline dark:text-amber-500">
        Ver todos os pontos de apoio no mapa
      </Link>
    </div>
  );
}
