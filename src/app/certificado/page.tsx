import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CertificadoGratuitoView from "@/components/CertificadoGratuitoView";
import RomariaPlusCompra from "@/components/RomariaPlusCompra";
import MensagemConquistaForm from "@/components/MensagemConquistaForm";
import VoltarButton from "@/components/VoltarButton";
import HistoricoPeregrinacoes, { type PeregrinacaoHistorico } from "@/components/HistoricoPeregrinacoes";
import { nomeRota } from "@/lib/constants";
import type { Certificado, CompraRomariaPlus, MensagemConquista, MeioTransporte, Peregrinacao } from "@/types/database";

export default async function CertificadoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/certificado");

  const [{ data: certificados }, { data: concluidasData }, { data: ativa }, { data: rotasData }, { data: comprasPagasData }] =
    await Promise.all([
      supabase.from("certificados").select("*").eq("user_id", user.id).order("emitido_em", { ascending: false }),
      // Rodada 56 — "Peregrinações concluídas" (antes em Minha peregrinação).
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
      supabase.from("compras_romaria_plus").select("certificado_id").eq("user_id", user.id).eq("status", "pago"),
    ]);

  const certificadoPorPeregrinacao = new Map<string, string>();
  ((certificados ?? []) as Certificado[]).forEach((c) => certificadoPorPeregrinacao.set(c.peregrinacao_id, c.id));
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

  if (!certificados?.length) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <VoltarButton href="/painel" />
        <h1 className="text-2xl font-bold">Meus certificados</h1>
        <p className="card text-center text-neutral-500" style={{ textAlign: "center" }}>
          Você ainda não tem certificado. Ao concluir uma peregrinação em Aparecida, ele aparece aqui
          automaticamente.
        </p>
        <HistoricoPeregrinacoes lista={historico} temPeregrinacaoAtiva={!!ativa} />
      </div>
    );
  }

  const certificadosLista = certificados as Certificado[];
  const idsCertificados = certificadosLista.map((c) => c.id);

  // As três consultas abaixo são independentes entre si — juntas num só
  // Promise.all em vez de uma atrás da outra (Rodada 30, mesma otimização
  // aplicada em /peregrinacao).
  const [{ data: perfil }, { data: compras }, { data: mensagensConquista }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    // Última compra de Romaria Plus conhecida por certificado (se houver
    // mais de uma tentativa, a mais recente é a que importa). tipo="inicial"
    // (Rodada 30): uma compra de PACOTE EXTRA de fotos não deve aparecer
    // aqui — este card é só sobre o Certificado Plus em si (a compra
    // inicial).
    supabase
      .from("compras_romaria_plus")
      .select("*")
      .in("certificado_id", idsCertificados)
      .eq("tipo", "inicial")
      .order("criado_em", { ascending: false }),
    // Mensagens de conquista (Rodada 27) já publicadas para os certificados
    // deste peregrino, se houver — usadas para mostrar "sua mensagem já
    // está publicada" em vez do formulário em branco de novo.
    supabase.from("mensagens_conquista").select("*").in("certificado_id", idsCertificados),
  ]);
  const isAdmin = !!perfil?.is_admin;

  const compraPorCertificado = new Map<string, CompraRomariaPlus>();
  ((compras ?? []) as CompraRomariaPlus[]).forEach((compra) => {
    if (!compraPorCertificado.has(compra.certificado_id)) {
      compraPorCertificado.set(compra.certificado_id, compra);
    }
  });

  const mensagemPorCertificado = new Map<string, MensagemConquista>();
  ((mensagensConquista ?? []) as MensagemConquista[]).forEach((m) => {
    mensagemPorCertificado.set(m.certificado_id, m);
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <VoltarButton href="/painel" />
      <h1 className="text-2xl font-bold">Meus certificados</h1>
      {certificadosLista.map((c) => {
        const compra = compraPorCertificado.get(c.id) ?? null;
        const pago = compra?.status === "pago";
        return (
          <div key={c.id} id={`certificado-${c.id}`} className="flex scroll-mt-6 flex-col gap-4">
            {/* O link "Certificado Plus →" que ficava aqui, ao lado deste
                título, foi movido (Rodada 16) para o lado direito de cada
                peregrinação concluída, na lista de "Minha peregrinação" —
                não fazia sentido ficar dentro desta página, que já mostra o
                certificado grátis logo abaixo. */}
            <h2 className="text-lg font-bold text-amber-800 dark:text-amber-500">Certificado</h2>
            {/* Grátis, sempre disponível para quem concluiu a peregrinação —
                sem a arte de pergaminho, que agora é exclusiva de quem compra
                a Romaria Plus (ver "Certificado Plus" abaixo). */}
            <CertificadoGratuitoView certificado={c} />

            <MensagemConquistaForm
              certificadoId={c.id}
              userId={user.id}
              nome={c.nome_peregrino.trim().split(/\s+/)[0]}
              cidade={c.origem}
              mensagemInicial={mensagemPorCertificado.get(c.id) ?? null}
            />

            <div id={`romaria-plus-${c.id}`} className="mt-2 flex scroll-mt-6 flex-col gap-4 border-t border-dashed border-amber-200 pt-6 dark:border-amber-900">
              <h2 className="text-center text-lg font-bold text-amber-800 dark:text-amber-500">Certificado Plus</h2>
              {pago && compra ? (
                // A partir da Rodada 18 a arte de pergaminho e o editor das
                // até 5 fotos ficam numa página própria, separada deste
                // certificado grátis (antes vinham embutidos aqui mesmo).
                <Link
                  href={`/certificado/plus/${c.id}`}
                  className="card flex items-center justify-center gap-2 text-center font-semibold text-amber-800 transition hover:border-amber-300 dark:text-amber-500"
                >
                  <Sparkles size={18} /> Minhas fotos da Romaria Plus →
                </Link>
              ) : (
                <RomariaPlusCompra certificadoId={c.id} compraInicial={compra} isAdmin={isAdmin} />
              )}
            </div>
          </div>
        );
      })}

      <HistoricoPeregrinacoes lista={historico} temPeregrinacaoAtiva={!!ativa} />
    </div>
  );
}
