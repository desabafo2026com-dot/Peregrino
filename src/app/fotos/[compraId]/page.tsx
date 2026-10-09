import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import RomariaPlusFotos from "@/components/RomariaPlusFotos";
import { ComprarPlusAvulso } from "@/components/FotosAvulsasAcoes";
import type { Certificado, CompraRomariaPlus, RomariaPlusFoto } from "@/types/database";

// Rodada 62b — galeria de artes avulsas (sem peregrinação registrada):
// a arte grátis (1 foto) ou a Romaria Plus avulsa (5 fotos + pacotes de 5).
export default async function FotosAvulsasPage({ params }: { params: Promise<{ compraId: string }> }) {
  const { compraId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/fotos/${compraId}`);

  const { data: compraData } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .eq("id", compraId)
    .eq("user_id", user.id)
    .maybeSingle();
  const compra = compraData as CompraRomariaPlus | null;
  if (!compra || compra.status !== "pago" || compra.tipo === "extra") redirect("/fotos");
  // Compra com certificado tem a sua própria página.
  if (compra.certificado_id) redirect(`/certificado/plus/${compra.certificado_id}`);

  const cortesia = compra.tipo === "cortesia";
  const ano = compra.ano ?? new Date().getFullYear();

  const [{ data: fotos }, { data: pacotesExtra }, { data: perfil }] = await Promise.all([
    supabase.from("romaria_plus_fotos").select("*").eq("compra_id", compra.id).order("indice"),
    supabase
      .from("compras_romaria_plus")
      .select("*")
      .eq("compra_pai_id", compra.id)
      .eq("tipo", "extra")
      .order("criado_em", { ascending: false }),
    supabase.from("profiles").select("nome_completo, is_admin").eq("id", user.id).maybeSingle(),
  ]);

  // "Certificado" só com o nome e o ano — as artes avulsas não têm datas,
  // origem, tempo nem distância da peregrinação.
  const pseudo = {
    id: compra.id,
    peregrinacao_id: "",
    user_id: user.id,
    codigo: `artes-${ano}`,
    nome_peregrino: (perfil?.nome_completo as string | undefined) ?? "Peregrino",
    dias_caminhada: null,
    data_inicio: null,
    data_fim: null,
    total_checkins: 0,
    rota_nome: null,
    origem: null,
    meio_transporte: null,
    meio_transporte_outro_desc: null,
    duracao_texto: null,
    distancia_km: null,
    emitido_em: `${ano}-07-01T15:00:00Z`,
  } as unknown as Certificado;

  const listaPacotes = (pacotesExtra ?? []) as CompraRomariaPlus[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <VoltarButton href="/fotos" label="Minhas fotos" />
      <div>
        <h1 className="mb-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
          {cortesia ? `Minha arte grátis — ${ano}` : `Minhas artes — ${ano}`}
        </h1>
        <p className="text-sm text-neutral-500">
          {cortesia
            ? "Escolha uma foto da sua peregrinação e um modelo. A primeira arte é por nossa conta!"
            : "Transforme suas fotos em artes prontas para baixar ou compartilhar."}
        </p>
      </div>
      <RomariaPlusFotos
        certificado={pseudo}
        compraId={compra.id}
        userId={user.id}
        fotosIniciais={(fotos ?? []) as RomariaPlusFoto[]}
        pacotesExtraPagos={listaPacotes.filter((p) => p.status === "pago").length}
        pacoteExtraPendente={listaPacotes.find((p) => p.status === "pendente") ?? null}
        ehAdmin={!!perfil?.is_admin}
        cortesia={cortesia}
        semPeregrinacao
        bonusFotos={compra.bonus_fotos ?? 0}
      />
      {cortesia && (
        <section
          id="adquirir"
          className="card flex scroll-mt-6 flex-col gap-3 border-t border-dashed border-amber-200 pt-6 dark:border-amber-900"
        >
          <h2 className="text-center text-lg font-bold text-amber-800 dark:text-amber-500">Gostou? Faça mais 5</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
            A Romaria Plus libera <strong>mais 5 artes</strong> com suas fotos de {ano}; sua arte grátis continua
            na mesma galeria. Depois de usar as 5, dá para comprar mais 5.
          </p>
          <ComprarPlusAvulso anoFixo={ano} />
        </section>
      )}
      <Link href="/fotos" className="text-center text-sm font-semibold text-amber-700">
        Ver todas as minhas fotos
      </Link>
    </div>
  );
}
