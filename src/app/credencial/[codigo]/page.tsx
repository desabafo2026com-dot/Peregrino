import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ShieldX, Phone, HeartPulse, MapPin, Users, Footprints } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { CrachaPublico } from "@/types/database";

export const metadata = {
  title: "Credencial do peregrino — O Peregrino",
  robots: { index: false },
};

// Rodada 54 — página aberta pelo QR code da credencial (crachá) do
// peregrino. Pública, sem login: mostra só o que a própria pessoa escolheu
// imprimir no crachá (ver cracha_publico, Migration 45).
export default async function CredencialPublicaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("cracha_publico", { p_codigo: codigo });
  const c = (data ?? null) as CrachaPublico | null;

  if (!c) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card flex flex-col items-center gap-2 text-center">
          <ShieldX size={36} className="text-red-600" />
          <h1 className="text-lg font-bold">Credencial não encontrada</h1>
          <p className="text-sm text-neutral-500" style={{ textAlign: "center" }}>
            O código <strong>{decodeURIComponent(codigo).toUpperCase()}</strong> não corresponde a nenhum peregrino
            cadastrado no O Peregrino.
          </p>
        </div>
      </div>
    );
  }

  const telefoneLink = (t: string) => `tel:${t.replace(/[^\d+]/g, "")}`;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="card flex flex-col items-center gap-2 border-green-200 text-center dark:border-green-900">
        <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-950 dark:text-green-300">
          <ShieldCheck size={14} /> Peregrino(a) cadastrado(a) no O Peregrino
        </span>
        {c.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.foto} alt="" className="mt-2 h-28 w-28 rounded-full object-cover ring-2 ring-amber-600" />
        )}
        <h1 className="text-2xl font-extrabold">{c.nome}</h1>
        {c.cidade && (
          <p className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            <MapPin size={14} /> {c.cidade}
          </p>
        )}
        {c.grupo && (
          <p className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            <Users size={14} /> {c.grupo}
          </p>
        )}
        <p className="font-mono text-sm font-bold text-amber-800 dark:text-amber-500">{c.codigo}</p>
        {c.em_caminhada && (
          <p className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
            <Footprints size={14} /> Com uma peregrinação em andamento no app
          </p>
        )}
      </div>

      {(c.emergencia_nome || c.emergencia_telefone || c.telefone || c.sangue || c.saude) && (
        <div className="card border-red-200 dark:border-red-900">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-red-700">
            <HeartPulse size={18} /> Em caso de emergência
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            {(c.emergencia_nome || c.emergencia_telefone) && (
              <p style={{ textAlign: "left" }}>
                <span className="font-semibold">Avisar:</span> {c.emergencia_nome}{" "}
                {c.emergencia_telefone && (
                  <a href={telefoneLink(c.emergencia_telefone)} className="font-semibold text-amber-700 underline">
                    {c.emergencia_telefone}
                  </a>
                )}
              </p>
            )}
            {c.telefone && (
              <p style={{ textAlign: "left" }}>
                <span className="font-semibold">Telefone do peregrino:</span>{" "}
                <a href={telefoneLink(c.telefone)} className="font-semibold text-amber-700 underline">
                  {c.telefone}
                </a>
              </p>
            )}
            {c.sangue && (
              <p style={{ textAlign: "left" }}>
                <span className="font-semibold">Tipo sanguíneo:</span> {c.sangue}
              </p>
            )}
            {c.saude && (
              <p style={{ textAlign: "left" }}>
                <span className="font-semibold">Saúde:</span> {c.saude}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-2 flex items-center gap-2 font-bold">
          <Phone size={18} /> Números de emergência
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["190", "Polícia Militar"],
            ["191", "PRF (rodovia)"],
            ["192", "SAMU"],
            ["193", "Bombeiros"],
          ].map(([n, nome]) => (
            <a key={n} href={`tel:${n}`} className="rounded-lg border border-neutral-200 px-3 py-2 font-semibold dark:border-neutral-800">
              {n} <span className="font-normal text-neutral-500">· {nome}</span>
            </a>
          ))}
        </div>
      </div>

      <Link href="/" className="flex items-center justify-center gap-2 text-sm text-neutral-500">
        <Image src="/icons/logo-emblema.png" alt="" width={24} height={24} className="rounded" /> Conheça o app O Peregrino
      </Link>
    </div>
  );
}
