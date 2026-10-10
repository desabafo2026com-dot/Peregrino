import { HandHeart, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import { autorMural, type AgradecimentoPapPublico, type IntencaoMural } from "@/lib/mural";

export const metadata = {
  title: "Mural de pedidos e agradecimentos — O Peregrino",
};

// Rodada 65 — mural público: pedidos e agradecimentos dos peregrinos (a
// partir do início da caminhada, com autorização) e agradecimentos aos PAPs
// (de quem concluiu a peregrinação).
export default async function MuralPage() {
  const supabase = await createClient();
  const [{ data: muralData }, { data: papData }] = await Promise.all([
    supabase.from("mural_intencoes").select("*").order("desde", { ascending: false }).limit(200),
    supabase.from("agradecimentos_pap_publico").select("*").order("criado_em", { ascending: false }).limit(200),
  ]);
  const mural = (muralData ?? []) as IntencaoMural[];
  const paps = (papData ?? []) as AgradecimentoPapPublico[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <VoltarButton href="/" />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HandHeart size={24} className="text-sky-700" /> Mural de pedidos e agradecimentos
        </h1>
        <p className="text-sm text-neutral-500">
          Intenções que os peregrinos levam até Aparecida. Reze com eles. Para deixar a sua, escreva no planejamento
          da sua peregrinação.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {mural.length === 0 ? (
          <p className="card text-sm text-neutral-500">Ainda não há pedidos ou agradecimentos no mural.</p>
        ) : (
          mural.map((i) => (
            <article key={i.id} className="card flex flex-col gap-1">
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
                  i.tipo === "pedido"
                    ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300"
                    : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {i.tipo === "pedido" ? "Pedido" : "Agradecimento"}
              </span>
              <p className="text-neutral-700 italic dark:text-neutral-200" style={{ textAlign: "left" }}>
                &quot;{i.texto}&quot;
              </p>
              <p className="text-xs font-semibold text-neutral-500">— {autorMural(i.nome, i.cidade)}</p>
            </article>
          ))
        )}
      </section>

      <section id="paps" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-green-800 dark:text-green-400">
          <Heart size={20} /> Agradecimentos aos Pontos de Apoio
        </h2>
        {paps.length === 0 ? (
          <p className="card text-sm text-neutral-500">
            Ainda não há agradecimentos. Quem conclui a peregrinação pode agradecer aos PAPs na página do certificado.
          </p>
        ) : (
          paps.map((a) => (
            <article key={a.id} className="card flex flex-col gap-1">
              <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-900 dark:bg-green-950 dark:text-green-300">
                {a.pap_id ? `Para ${a.pap_nome}` : a.pap_nome}
              </span>
              <p className="text-neutral-700 italic dark:text-neutral-200" style={{ textAlign: "left" }}>
                &quot;{a.mensagem}&quot;
              </p>
              <p className="text-xs font-semibold text-neutral-500">— {autorMural(a.nome, a.cidade)}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
