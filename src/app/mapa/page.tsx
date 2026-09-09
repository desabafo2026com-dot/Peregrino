import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapClient from "./MapClient";
import { MapPinPlus } from "lucide-react";
import type { PontoApoio, PontoRisco } from "@/types/database";

export default async function MapaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!perfil?.is_admin;
  }

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
          <h1 className="text-2xl font-bold">Mapa de PAP</h1>
          <p className="text-sm text-neutral-500">
            PAP — Pontos de Apoio ao Peregrino (marrom) e locais de risco (vermelho)
            {user ? ", e peregrinos em caminhada (azul)" : ""}.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/pap/novo"
            className="btn-primary flex items-center gap-1 whitespace-nowrap"
          >
            <MapPinPlus size={18} /> Cadastrar PAP
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
          para ver peregrinos ativos no mapa.
        </p>
      )}
      {user && !isAdmin && (
        <p className="mt-4 text-sm text-neutral-500">
          Novos PAP são cadastrados pelos administradores. Quer ajudar
          indicando um ponto de apoio? Fale com a equipe do Peregrino.
        </p>
      )}
    </div>
  );
}
