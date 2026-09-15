import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GerentesAdminClient from "./GerentesAdminClient";
import VoltarButton from "@/components/VoltarButton";
import type { GerentePap } from "@/types/database";

export default async function AdminGerentesPage() {
  const supabase = await createClient();
  const [{ data }, { data: paps }] = await Promise.all([
    supabase.from("gerentes_pap").select("*").order("criado_em", { ascending: false }),
    supabase.from("pontos_apoio").select("nome, gerente_id").not("gerente_id", "is", null),
  ]);

  // Nomes dos PAP de cada gerente — usados na busca unificada (por nome do
  // gerente, telefone/organização ou nome do PAP que ele cadastrou).
  const papsPorGerente = new Map<string, string[]>();
  (paps ?? []).forEach((p) => {
    const gerenteId = p.gerente_id as string;
    const lista = papsPorGerente.get(gerenteId) ?? [];
    lista.push(p.nome as string);
    papsPorGerente.set(gerenteId, lista);
  });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Gerentes de PAP</h2>
      <p className="mb-2 text-sm text-neutral-500">
        Lista de consulta — o cadastro da conta de gerente não precisa mais de
        aprovação. O que continua exigindo aprovação da administração é a
        divulgação de cada PAP no mapa.
      </p>
      <Link
        href="/admin/pap"
        className="mb-6 inline-block w-fit text-sm font-medium text-amber-700 dark:text-amber-500"
      >
        Aprovar vinculação de PAP →
      </Link>
      <GerentesAdminClient
        gerentesIniciais={(data ?? []) as GerentePap[]}
        papsPorGerente={Object.fromEntries(papsPorGerente)}
      />
    </div>
  );
}
