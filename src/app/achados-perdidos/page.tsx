import { createClient } from "@/lib/supabase/server";
import { SearchCheck } from "lucide-react";
import VoltarButton from "@/components/VoltarButton";
import AchadosPerdidosClient, { type AnuncioPublico, type MeuAnuncio } from "./AchadosPerdidosClient";

export const metadata = {
  title: "Achados e perdidos — O Peregrino",
};

// Rodada 68 — achados e perdidos do caminho (sem foto, para não gastar o
// espaço de armazenamento). Cada anúncio fica 60 dias ou até ser resolvido.
export default async function AchadosPerdidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: anuncios }, { data: meus }] = await Promise.all([
    supabase.from("achados_perdidos_publicos").select("*").order("criado_em", { ascending: false }).limit(300),
    user
      ? supabase
          .from("achados_perdidos")
          .select("id, tipo, titulo, status, ativo, expira_em")
          .eq("user_id", user.id)
          .order("criado_em", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <VoltarButton href="/" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <SearchCheck size={24} className="text-amber-700" /> Achados e perdidos
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
        Perdeu algo no caminho ou achou alguma coisa? Publique aqui para ajudar a devolver ao dono. Se achou um
        documento, você também pode deixar num PAP ou entregar à polícia.
      </p>
      <AchadosPerdidosClient
        userId={user?.id ?? null}
        anuncios={(anuncios ?? []) as AnuncioPublico[]}
        meusIniciais={(meus ?? []) as MeuAnuncio[]}
      />
    </div>
  );
}
