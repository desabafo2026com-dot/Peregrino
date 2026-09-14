import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import RiscosAdminClient from "./RiscosAdminClient";
import { MapPinPlus } from "lucide-react";
import type { PontoRisco, Rota } from "@/types/database";

export default async function RiscosAdminPage() {
  const supabase = await createClient();
  const [{ data: riscos }, { data: rotas }] = await Promise.all([
    supabase.from("pontos_risco").select("*").order("criado_em", { ascending: false }),
    supabase.from("rotas").select("*").order("ordem"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <VoltarButton href="/admin" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Locais de risco</h1>
          <p className="text-sm text-neutral-500">
            Edite, exclua ou acrescente foto aos pontos de risco cadastrados.
          </p>
        </div>
        <Link href="/admin/riscos/novo" className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <MapPinPlus size={18} /> Cadastrar novo
        </Link>
      </div>
      <RiscosAdminClient
        riscosIniciais={(riscos ?? []) as PontoRisco[]}
        rotas={(rotas ?? []) as Rota[]}
      />
    </div>
  );
}
