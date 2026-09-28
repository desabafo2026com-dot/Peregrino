import Link from "next/link";
import { MapPin, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PapAdminClient from "./PapAdminClient";
import VoltarButton from "@/components/VoltarButton";
import type { PontoApoio } from "@/types/database";

export default async function AdminPapPage() {
  const supabase = await createClient();
  const { data: pontos } = await supabase
    .from("pontos_apoio")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-xl font-bold">PAP cadastrados por gerentes</h2>
          <p className="text-sm text-neutral-500">
            Aprove a divulgação no mapa público, ou rejeite. PAP pendentes não
            aparecem no mapa até serem aprovados. Use <strong>Editar</strong> para
            ajustar os dados de um PAP no lugar do gerente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/pap/transferencias"
            className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <ArrowLeftRight size={16} /> Transferências
          </Link>
          <Link
            href="/admin/pap/pre-cadastro"
            className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <MapPin size={16} /> Posição dos PAP pré-cadastrados
          </Link>
        </div>
      </div>
      <PapAdminClient pontosIniciais={(pontos ?? []) as PontoApoio[]} />
    </div>
  );
}
