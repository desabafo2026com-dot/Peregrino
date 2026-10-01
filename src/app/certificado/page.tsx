import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import HistoricoPeregrinacoes, { type PeregrinacaoHistorico } from "@/components/HistoricoPeregrinacoes";
import { nomeRota } from "@/lib/constants";
import type { Certificado, MeioTransporte, Peregrinacao } from "@/types/database";

// Rodada 60 — "Meus certificados" abre primeiro a lista das peregrinações
// concluídas (por ano), cada uma com o link para o seu certificado; o
// certificado, o Certificado Plus e a compra do Plus ficam numa página
// própria (/certificado/[id]). Mais organizado para quem faz mais de uma
// peregrinação no mesmo ano.
export default async function CertificadoPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string; romaria_plus?: string }>;
}) {
  const { compra } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/certificado");

  // Volta do Mercado Pago de compras antigas (endereço anterior à Rodada 60).
  if (compra) {
    const { data: c } = await supabase
      .from("compras_romaria_plus")
      .select("certificado_id")
      .eq("id", compra)
      .eq("user_id", user.id)
      .maybeSingle();
    if (c?.certificado_id) redirect(`/certificado/${c.certificado_id}?romaria_plus=retorno#romaria-plus`);
  }

  const [{ data: certificados }, { data: concluidasData }, { data: ativa }, { data: rotasData }, { data: comprasPagasData }] =
    await Promise.all([
      supabase.from("certificados").select("id, peregrinacao_id").eq("user_id", user.id),
      supabase
        .from("peregrinacoes")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "concluida")
        .order("data_fim", { ascending: false }),
      supabase
        .from("peregrinacoes")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["planejada", "em_andamento"])
        .limit(1)
        .maybeSingle(),
      supabase.from("rotas").select("id, slug, nome"),
      supabase
        .from("compras_romaria_plus")
        .select("certificado_id")
        .eq("user_id", user.id)
        .eq("status", "pago")
        .eq("tipo", "inicial"),
    ]);

  const certificadoPorPeregrinacao = new Map<string, string>();
  ((certificados ?? []) as Pick<Certificado, "id" | "peregrinacao_id">[]).forEach((c) =>
    certificadoPorPeregrinacao.set(c.peregrinacao_id, c.id)
  );
  const certificadosComPlus = new Set((comprasPagasData ?? []).map((c) => c.certificado_id as string));
  const rotaPorId = new Map((rotasData ?? []).map((r) => [r.id as string, r as { slug: string; nome: string }]));
  const historico: PeregrinacaoHistorico[] = ((concluidasData ?? []) as Peregrinacao[]).map((p) => {
    const certificadoId = certificadoPorPeregrinacao.get(p.id) ?? null;
    return {
      id: p.id,
      meioTransporte: (p.meio_transporte as MeioTransporte) ?? null,
      meioTransporteOutroDesc: p.meio_transporte_outro_desc ?? null,
      rotaNome: p.rota_id ? nomeRota(rotaPorId.get(p.rota_id)) || null : null,
      origem: p.cidade_origem ?? p.cidade_inicio ?? null,
      dataInicio: p.data_inicio,
      dataFim: p.data_fim,
      temCertificado: !!certificadoId,
      certificadoId,
      plusPago: certificadoId ? certificadosComPlus.has(certificadoId) : false,
    };
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <VoltarButton href="/painel" />
      <div>
        <h1 className="text-2xl font-bold">Meus certificados</h1>
        <p className="text-sm text-neutral-500">
          Suas peregrinações concluídas. Toque em <strong>Ver certificado</strong> para abrir o certificado e o
          Certificado Plus.
        </p>
      </div>
      {historico.length === 0 ? (
        <p className="card text-center text-neutral-500" style={{ textAlign: "center" }}>
          Você ainda não concluiu nenhuma peregrinação. Ao concluir em Aparecida, o certificado aparece aqui
          automaticamente.
        </p>
      ) : (
        <HistoricoPeregrinacoes lista={historico} temPeregrinacaoAtiva={!!ativa} porAno />
      )}
    </div>
  );
}
