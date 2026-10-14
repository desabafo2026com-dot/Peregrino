import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import CadernoDeBordo from "@/components/CadernoDeBordo";
import type { DadosCarimbo } from "@/components/CarimboPap";

export const metadata = {
  title: "Caderno de bordo — O Peregrino",
};

interface CarimboComPeregrinacao extends DadosCarimbo {
  peregrinacao_id: string;
}

// Rodada 68 — caderno de bordo das peregrinações encerradas (a que está em
// andamento fica em "Minha peregrinação").
export default async function CadernoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/caderno");

  const [{ data: carimbosData }, { data: peregrinacoesData }] = await Promise.all([
    supabase
      .from("carimbos_caderno")
      .select("id, peregrinacao_id, pap_nome, cidade, km, carimbado_em")
      .eq("user_id", user.id)
      .order("carimbado_em", { ascending: true }),
    supabase
      .from("peregrinacoes")
      .select("id, status, data_inicio, cidade_origem, cidade_inicio")
      .eq("user_id", user.id)
      .order("data_inicio", { ascending: false }),
  ]);

  const carimbos = (carimbosData ?? []) as CarimboComPeregrinacao[];
  const encerradas = ((peregrinacoesData ?? []) as {
    id: string;
    status: string;
    data_inicio: string | null;
    cidade_origem: string | null;
    cidade_inicio: string | null;
  }[]).filter((p) => p.status !== "planejada" && p.status !== "em_andamento");
  const grupos = encerradas
    .map((p) => ({ p, lista: carimbos.filter((c) => c.peregrinacao_id === p.id) }))
    .filter((g) => g.lista.length > 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VoltarButton href="/painel" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <BookOpen size={24} className="text-amber-700" /> Caderno de bordo
      </h1>
      {grupos.length === 0 ? (
        <p className="card text-sm text-neutral-500">
          Os carimbos dos PAPs aparecem aqui depois que a peregrinação é encerrada. A peregrinação em andamento tem o
          caderno dentro de Minha peregrinação.
        </p>
      ) : (
        grupos.map(({ p, lista }) => {
          const ano = p.data_inicio
            ? new Date(p.data_inicio).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric" })
            : "";
          const origem = p.cidade_origem ?? p.cidade_inicio;
          return (
            <CadernoDeBordo
              key={p.id}
              carimbos={lista}
              titulo={`Peregrinação ${ano}${origem ? ` · de ${origem}` : ""}`}
              mostrarDica={false}
            />
          );
        })
      )}
    </div>
  );
}
