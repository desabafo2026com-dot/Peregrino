import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, ChevronRight, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import ModelosPlusVitrine from "@/components/ModelosPlusVitrine";
import { ArteGratisAvulsa, ComprarPlusAvulso, AguardandoPagamento } from "@/components/FotosAvulsasAcoes";
import type { CompraRomariaPlus } from "@/types/database";

export const metadata = {
  title: "Minhas fotos — O Peregrino",
};

// Rodada 62b — artes com suas fotos mesmo sem ter registrado a peregrinação
// no app: a 1ª é grátis (de qualquer ano, uma por conta); depois, a Romaria
// Plus avulsa libera mais 5 artes (sem Certificado Plus) e dá para ampliar
// de 5 em 5. As artes não trazem os dados da peregrinação (datas, origem,
// tempo), só o nome, o ano e a frase.
export default async function FotosPage({ searchParams }: { searchParams: Promise<{ compra?: string }> }) {
  const { compra: compraRetorno } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/fotos");

  const { data: comprasData } = await supabase
    .from("compras_romaria_plus")
    .select("*")
    .eq("user_id", user.id)
    .in("tipo", ["inicial", "cortesia"])
    .order("criado_em", { ascending: false });
  const compras = (comprasData ?? []) as CompraRomariaPlus[];
  const cortesia = compras.find((c) => c.tipo === "cortesia") ?? null;
  const avulsas = compras.filter((c) => !c.certificado_id && c.status === "pago");
  const retorno = compraRetorno ? compras.find((c) => c.id === compraRetorno) : null;

  const contagem = new Map<string, number>();
  if (avulsas.length) {
    const { data: fotos } = await supabase
      .from("romaria_plus_fotos")
      .select("compra_id, arte_url")
      .in(
        "compra_id",
        avulsas.map((c) => c.id)
      );
    (fotos ?? []).forEach((f) => {
      if (f.arte_url) contagem.set(f.compra_id as string, (contagem.get(f.compra_id as string) ?? 0) + 1);
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VoltarButton href="/painel" />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Camera size={24} className="text-amber-700" /> Minhas fotos
        </h1>
        <p className="text-sm text-neutral-500">
          Transforme fotos da sua peregrinação em artes para guardar e compartilhar, mesmo que você não tenha
          registrado a caminhada no app. A primeira é presente nosso.
        </p>
      </div>

      {retorno && retorno.status !== "pago" && <AguardandoPagamento compraId={retorno.id} />}

      {avulsas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold tracking-wide text-neutral-500 uppercase">Minhas galerias</h2>
          {avulsas.map((c) => (
            <Link
              key={c.id}
              href={`/fotos/${c.id}`}
              className="card flex items-center gap-3 transition hover:border-amber-400"
            >
              <Camera size={22} className="shrink-0 text-amber-700" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  Artes {c.ano} {c.tipo === "cortesia" ? "— arte grátis" : "— Romaria Plus"}
                </span>
                <span className="block text-sm text-neutral-500">
                  {contagem.get(c.id) ?? 0} arte(s) salva(s)
                </span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-neutral-400" />
            </Link>
          ))}
        </section>
      )}

      {!cortesia && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-center font-bold text-amber-800 dark:text-amber-500">Sua primeira arte é grátis</h2>
          <ModelosPlusVitrine />
          <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
            Escolha o ano da sua peregrinação, envie uma foto e escolha o modelo. Uma arte grátis por pessoa.
          </p>
          <ArteGratisAvulsa />
        </section>
      )}

      {cortesia?.certificado_id && (
        <p className="card text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
          Sua arte grátis já foi usada numa peregrinação registrada.{" "}
          <Link href={`/certificado/plus/${cortesia.certificado_id}`} className="font-semibold text-amber-700 underline">
            Ver arte
          </Link>
        </p>
      )}

      <section id="adquirir" className="card flex scroll-mt-6 flex-col gap-3">
        <h2 className="text-center font-bold text-amber-800 dark:text-amber-500">Romaria Plus — 5 artes</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
          Mais <strong>5 artes</strong> com suas fotos do ano escolhido. Usou as 5? Dá para comprar mais 5. (Sem
          Certificado Plus: ele vem com a peregrinação registrada no app.)
        </p>
        <ComprarPlusAvulso />
      </section>

      <Link href="/certificado" className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
        <Award size={16} /> Registrou a peregrinação no app? Veja em Meus certificados
      </Link>
    </div>
  );
}
