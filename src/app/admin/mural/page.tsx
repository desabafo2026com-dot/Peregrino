import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import MuralAdminClient, { type ItemModeracao } from "./MuralAdminClient";

// Rodada 65 — moderação do mural de pedidos/agradecimentos (só os que o
// peregrino autorizou mostrar) e dos agradecimentos aos PAPs. Publicam na
// hora; aqui o administrador oculta (ou reexibe) o que for inadequado.
export default async function AdminMuralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const [{ data: intencoes }, { data: agradecimentos }] = await Promise.all([
    supabase
      .from("intencoes_peregrinacao")
      .select("id, tipo, texto, nome, cidade, ativo, criado_em")
      .eq("publico", true)
      .order("criado_em", { ascending: false })
      .limit(300),
    supabase
      .from("agradecimentos_pap")
      .select("id, pap_nome, mensagem, nome, cidade, ativo, criado_em")
      .order("criado_em", { ascending: false })
      .limit(300),
  ]);

  type Intencao = { id: string; tipo: string; texto: string; nome: string; cidade: string | null; ativo: boolean; criado_em: string };
  type Agradecimento = { id: string; pap_nome: string; mensagem: string; nome: string; cidade: string | null; ativo: boolean; criado_em: string };

  const itensIntencoes: ItemModeracao[] = ((intencoes ?? []) as Intencao[]).map((i) => ({
    id: i.id,
    tabela: "intencoes_peregrinacao",
    rotulo: i.tipo === "pedido" ? "Pedido" : "Agradecimento",
    texto: i.texto,
    nome: i.nome,
    cidade: i.cidade,
    ativo: i.ativo,
    criado_em: i.criado_em,
  }));
  const itensPaps: ItemModeracao[] = ((agradecimentos ?? []) as Agradecimento[]).map((a) => ({
    id: a.id,
    tabela: "agradecimentos_pap",
    rotulo: `Para ${a.pap_nome}`,
    texto: a.mensagem,
    nome: a.nome,
    cidade: a.cidade,
    ativo: a.ativo,
    criado_em: a.criado_em,
  }));

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Mural e agradecimentos</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Pedidos e agradecimentos que os peregrinos autorizaram mostrar no mural (aparecem a partir do início da
        peregrinação) e os agradecimentos aos PAPs (deixados depois da conclusão). Publicam na hora — oculte aqui
        o que for inadequado (o registro não é apagado, só deixa de aparecer).
      </p>
      <h3 className="mb-2 font-bold text-amber-800 dark:text-amber-500">Mural de pedidos e agradecimentos</h3>
      <MuralAdminClient itensIniciais={itensIntencoes} vazio="Nenhum pedido ou agradecimento público ainda." />
      <h3 className="mt-8 mb-2 font-bold text-green-800 dark:text-green-400">Agradecimentos aos PAPs</h3>
      <MuralAdminClient itensIniciais={itensPaps} vazio="Nenhum agradecimento a PAP ainda." />
    </div>
  );
}
