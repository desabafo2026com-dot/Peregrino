import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapClient from "./MapClient";
import { Plus } from "lucide-react";
import type { PontoApoio, PontoRisco } from "@/types/database";

export default async function MapaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: pontosApoio }, { data: pontosRisco }, { data: localizacoes }] =
    await Promise.all([
      supabase.from("pontos_apoio").select("*").eq("ativo", true),
      supabase.from("pontos_risco").select("*"),
      user
        ? supabase.from("localizacoes_ativas").select("user_id, latitude, longitude")
        : Promise.resolve({ data: [] as { user_id: string; latitude: number; longitude: number }[] }),
    ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa da rota</h1>
          <p className="text-sm text-neutral-500">
            Pontos de apoio (marrom), pontos de risco (vermelho)
            {user ? " e peregrinos em caminhada (azul)" : ""}.
          </p>
        </div>
        {user && (
          <Link
            href="/pontos-apoio/novo"
            className="btn-primary flex items-center gap-1 whitespace-nowrap"
          >
            <Plus size={18} /> Novo ponto
          </Link>
        )}
      </div>

      <MapClient
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        pontosRisco={(pontosRisco ?? []) as PontoRisco[]}
        peregrinos={localizacoes ?? []}
      />

      {!user && (
        <p className="mt-4 text-sm text-neutral-500">
          <Link href="/login" className="font-semibold text-amber-700">
            Entre na sua conta
          </Link>{" "}
          para cadastrar pontos de apoio e ver peregrinos ativos no mapa.
        </p>
      )}
    </div>
  );
}
