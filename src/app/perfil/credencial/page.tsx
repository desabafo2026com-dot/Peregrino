import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import CredencialEditor from "./CredencialEditor";
import type { CrachaPeregrino, Profile } from "@/types/database";

export const metadata = {
  title: "Minha credencial — O Peregrino",
};

// Rodada 54 — credencial (crachá) do peregrino para imprimir e pendurar na
// mochila, com os dados que a pessoa escolher e um código individual
// gerado pelo sistema (Migration 45).
export default async function CredencialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/perfil/credencial");

  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!perfil) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/perfil" />
        <p className="mb-4 text-neutral-600 dark:text-neutral-300">
          Complete seu perfil de peregrino antes de gerar a credencial.
        </p>
        <Link href="/perfil" className="btn-primary inline-block">
          Completar perfil
        </Link>
      </div>
    );
  }

  const { data: cracha, error } = await supabase.rpc("meu_cracha");

  return (
    <div className="mx-auto max-w-3xl">
      <VoltarButton href="/perfil" />
      <h1 className="mb-1 text-2xl font-bold">Minha credencial de peregrino</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Um crachá para imprimir e pendurar na mochila, com os dados que você escolher e um código só
        seu. O QR code leva a uma página que confirma que você é peregrino(a) cadastrado(a) no O Peregrino.
      </p>
      {error || !cracha ? (
        <p className="card text-sm text-neutral-600">
          A credencial ainda não está disponível. Tente de novo mais tarde.
        </p>
      ) : (
        <CredencialEditor cracha={cracha as CrachaPeregrino} perfil={perfil as Profile} />
      )}
    </div>
  );
}
