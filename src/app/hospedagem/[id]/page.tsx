import Link from "next/link";
import { Hotel, Utensils, MapPin, Phone, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import { BR_LABELS, SENTIDO_PISTA_LABELS, TIPO_COMERCIO_LABELS } from "@/lib/constants";
import type { PontoComercial } from "@/types/database";

// Rodada 71 — página pública de um hotel/restaurante (destino do QR code
// impresso para o estabelecimento).
export default async function ComercioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("pontos_comerciais").select("*").eq("id", id).eq("ativo", true).maybeSingle();
  const c = data as PontoComercial | null;

  if (!c) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/hospedagem" />
        <Info className="mx-auto mb-3 text-neutral-400" size={32} />
        <p className="text-neutral-500">Este estabelecimento não foi encontrado.</p>
        <Link href="/hospedagem" className="btn-secondary mt-4 inline-block">
          Ver hotéis e restaurantes
        </Link>
      </div>
    );
  }

  const Icone = c.tipo === "hotel" ? Hotel : Utensils;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <VoltarButton href="/hospedagem" />
      {c.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.foto_url} alt={c.nome} className="h-48 w-full rounded-2xl object-cover" />
      )}
      <div className="card flex flex-col gap-1">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-500">
          <Icone size={14} /> {TIPO_COMERCIO_LABELS[c.tipo] ?? c.tipo}
        </p>
        <h1 className="text-xl font-bold">{c.nome}</h1>
        <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <MapPin size={16} className="shrink-0" />
          {c.cidade ?? "cidade não informada"}
          {c.km_referencia != null ? ` — ${BR_LABELS[c.br] ?? c.br} km ${c.km_referencia}` : ""}
          {c.sentido_pista ? ` (${SENTIDO_PISTA_LABELS[c.sentido_pista] ?? ""})` : ""}
        </p>
        {c.ponto_referencia && <p className="text-sm text-neutral-600 dark:text-neutral-300">Referência: {c.ponto_referencia}</p>}
        {c.exibir_telefone && c.telefone && (
          <a href={`tel:${c.telefone.replace(/\D/g, "")}`} className="flex w-fit items-center gap-2 text-sm font-semibold text-amber-700 underline dark:text-amber-500">
            <Phone size={16} /> {c.telefone}
          </a>
        )}
        {c.descricao && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{c.descricao}</p>}
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary text-center"
      >
        Abrir no mapa
      </a>
      <Link href="/hospedagem" className="btn-secondary text-center">
        Ver todos os hotéis e restaurantes
      </Link>
    </div>
  );
}
