import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CertificadoGratuitoView from "@/components/CertificadoGratuitoView";
import RomariaPlusCompra from "@/components/RomariaPlusCompra";
import MensagemConquistaForm from "@/components/MensagemConquistaForm";
import VoltarButton from "@/components/VoltarButton";
import type { Certificado, CompraRomariaPlus, MensagemConquista } from "@/types/database";

export default async function CertificadoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/certificado");

  const { data: certificados } = await supabase
    .from("certificados")
    .select("*")
    .eq("user_id", user.id)
    .order("emitido_em", { ascending: false });

  if (!certificados?.length) {
    return (
      <div className="mx-auto max-w-md text-center text-neutral-500">
        <VoltarButton href="/peregrinacao" />
        <p>
          Você ainda não concluiu nenhuma peregrinação. Ao finalizar, o
          certificado aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  const certificadosLista = certificados as Certificado[];

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = !!perfil?.is_admin;

  // Última compra de Romaria Plus conhecida por certificado (se houver
  // mais de uma tentativa, a mais recente é a que importa).
  const { data: compras } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .in(
      "certificado_id",
      certificadosLista.map((c) => c.id)
    )
    .order("criado_em", { ascending: false });

  const compraPorCertificado = new Map<string, CompraRomariaPlus>();
  ((compras ?? []) as CompraRomariaPlus[]).forEach((compra) => {
    if (!compraPorCertificado.has(compra.certificado_id)) {
      compraPorCertificado.set(compra.certificado_id, compra);
    }
  });

  // Mensagens de conquista (Rodada 27) já publicadas para os certificados
  // deste peregrino, se houver — usadas para mostrar "sua mensagem já está
  // publicada" em vez do formulário em branco de novo.
  const { data: mensagensConquista } = await supabase
    .from("mensagens_conquista")
    .select("*")
    .in(
      "certificado_id",
      certificadosLista.map((c) => c.id)
    );
  const mensagemPorCertificado = new Map<string, MensagemConquista>();
  ((mensagensConquista ?? []) as MensagemConquista[]).forEach((m) => {
    mensagemPorCertificado.set(m.certificado_id, m);
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <VoltarButton href="/peregrinacao" />
      <h1 className="text-2xl font-bold">Meus certificados</h1>
      {certificadosLista.map((c) => {
        const compra = compraPorCertificado.get(c.id) ?? null;
        const pago = compra?.status === "pago";
        return (
          <div key={c.id} className="flex flex-col gap-4">
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
    </div>
  );
}
