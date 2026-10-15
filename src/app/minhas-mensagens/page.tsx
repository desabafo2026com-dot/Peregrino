import { redirect } from "next/navigation";
import { HandHeart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import MinhasMensagensClient, { type MensagemMinha } from "./MinhasMensagensClient";

export const metadata = {
  title: "Minhas mensagens — O Peregrino",
};

interface PeregrinacaoRel {
  status: string;
  data_inicio: string | null;
  data_inicio_prevista: string | null;
  cidade_origem: string | null;
  cidade_inicio: string | null;
}

function anoDe(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric" }) : "";
}

// Rodada 74 — todas as mensagens que o peregrino mandou (pedidos e
// agradecimentos das peregrinações e agradecimentos aos PAPs), por ano,
// para editar ou apagar.
export default async function MinhasMensagensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/minhas-mensagens");

  const [{ data: intencoesData }, { data: agradecimentosData }] = await Promise.all([
    supabase
      .from("intencoes_peregrinacao")
      .select("id, tipo, texto, publico, ativo, criado_em, peregrinacoes(status, data_inicio, data_inicio_prevista, cidade_origem, cidade_inicio)")
      .eq("user_id", user.id),
    supabase
      .from("agradecimentos_pap")
      .select("id, pap_nome, mensagem, ativo, criado_em")
      .eq("user_id", user.id),
  ]);

  const mensagens: MensagemMinha[] = [
    ...(intencoesData ?? []).map((i) => {
      const rel = (Array.isArray(i.peregrinacoes) ? i.peregrinacoes[0] : i.peregrinacoes) as PeregrinacaoRel | null;
      const quando = rel?.data_inicio ?? rel?.data_inicio_prevista ?? (i.criado_em as string);
      const origem = rel?.cidade_origem ?? rel?.cidade_inicio ?? null;
      return {
        origem: "intencao" as const,
        id: i.id as string,
        tipo: i.tipo as "pedido" | "agradecimento",
        texto: i.texto as string,
        publico: !!i.publico,
        ativo: !!i.ativo,
        quando,
        ano: anoDe(quando),
        contexto: `Peregrinação${origem ? ` de ${origem}` : ""}`,
        statusPeregrinacao: rel?.status ?? null,
      };
    }),
    ...(agradecimentosData ?? []).map((a) => ({
      origem: "agradecimento_pap" as const,
      id: a.id as string,
      tipo: "agradecimento" as const,
      texto: a.mensagem as string,
      publico: true,
      ativo: !!a.ativo,
      quando: a.criado_em as string,
      ano: anoDe(a.criado_em as string),
      contexto: `Agradecimento a ${a.pap_nome as string}`,
      statusPeregrinacao: null,
    })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VoltarButton href="/painel" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <HandHeart size={24} className="text-amber-700" /> Minhas mensagens
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
        Seus pedidos e agradecimentos das peregrinações e os agradecimentos que você mandou aos Pontos de Apoio, por
        ano. Você pode editar ou apagar qualquer um.
      </p>
      <MinhasMensagensClient inicial={mensagens} />
    </div>
  );
}
