import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import HospedagemAdminClient from "./HospedagemAdminClient";
import { MapPinPlus } from "lucide-react";
import type { PontoComercial } from "@/types/database";

export default async function HospedagemAdminPage() {
  const supabase = await createClient();
  const { data: comercios } = await supabase
    .from("pontos_comerciais")
    .select("*")
    .order("km_referencia", { ascending: true, nullsFirst: false });

  return (
    <div className="flex flex-col gap-6">
      <VoltarButton href="/admin" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hotéis e Restaurantes</h1>
          <p className="text-sm text-neutral-500">
            Cadastre, edite, desative ou exclua os estabelecimentos anunciados aos peregrinos.
          </p>
        </div>
        <Link href="/admin/hospedagem/novo" className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <MapPinPlus size={18} /> Cadastrar novo
        </Link>
      </div>
      <HospedagemAdminClient comerciosIniciais={(comercios ?? []) as PontoComercial[]} />
    </div>
  );
}
