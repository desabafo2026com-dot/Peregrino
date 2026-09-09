import { createClient } from "@/lib/supabase/server";
import RotasAdminClient from "./RotasAdminClient";
import type { Rota, TrechoSeguranca } from "@/types/database";

export default async function AdminRotasPage() {
  const supabase = await createClient();
  const [{ data: rotas }, { data: trechos }] = await Promise.all([
    supabase.from("rotas").select("*").order("ordem"),
    supabase.from("trechos_seguranca").select("*").order("km_inicial"),
  ]);

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold">Trechos por rota</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Defina, para cada rota (Sul ou Norte), qual lado da rodovia seguir em
        cada trecho de km e o nível de risco.
      </p>
      <RotasAdminClient
        rotasIniciais={(rotas ?? []) as Rota[]}
        trechosIniciais={(trechos ?? []) as TrechoSeguranca[]}
      />
    </div>
  );
}
