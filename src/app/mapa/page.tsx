import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapClient from "./MapClient";
import VoltarButton from "@/components/VoltarButton";
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
      isAdmin
        ? supabase.from("localizacoes_ativas").select("user_id, latitude, longitude")
        : Promise.resolve({ data: [] as { user_id: string; latitude: number; longitude: number }[] }),
    ]);

  return (
    <div>
      <VoltarButton href="/" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa de PAP</h1>
          <p className="text-sm text-neutral-500">
            PAP — Pontos de Apoio ao Peregrino (marrom) e locais de risco (vermelho).
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

      <p className="mt-4 text-xs text-neutral-400">
        A localização de peregrinos em caminhada não é exibida publicamente
        neste mapa — ela é usada apenas pela administração para avisar sobre
        condições adversas e para localizar peregrinos em caso de emergência.
      </p>
      {user && !isAdmin && (
        <p className="mt-2 text-sm text-neutral-500">
          Novos PAP são cadastrados por gerentes de PAP aprovados ou pela
          equipe administrativa.{" "}
          <Link href="/gerente-pap/cadastro" className="font-semibold text-amber-700">
            Quer cadastrar o seu?
          </Link>
        </p>
      )}
    </div>
  );
}
