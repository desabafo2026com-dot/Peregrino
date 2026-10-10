import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import { calcularMedalhas, nivelPeregrino, TODOS_NIVEIS } from "@/lib/conquistas";
import { carregarDadosConquistas } from "@/lib/conquistas-dados";

export const metadata = {
  title: "Minhas conquistas — O Peregrino",
};

// Rodada 65 — nível do peregrino e medalhas de conquista.
export default async function ConquistasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/conquistas");

  const dados = await carregarDadosConquistas(supabase, user.id);
  // Rodada 66 — nível e medalhas de quantidade somam as feitas fora do app.
  const total = dados.peregrinacoes + (dados.foraApp ?? 0);
  const nivel = nivelPeregrino(total);
  const medalhas = calcularMedalhas(dados);
  const ganhas = medalhas.filter((m) => m.conquistada).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VoltarButton href="/painel" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Award size={24} className="text-amber-700" /> Minhas conquistas
      </h1>

      <section className="card flex flex-col items-center gap-2 text-center">
        <span
          className="rounded-full px-4 py-1.5 text-sm font-extrabold tracking-wide text-white uppercase shadow-sm"
          style={{ background: nivel.cor }}
        >
          {nivel.nome}
        </span>
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
          {total} peregrinaç{total === 1 ? "ão concluída" : "ões concluídas"}
          {dados.kmTotal > 0 ? ` · ≈ ${Math.round(dados.kmTotal)} km` : ""}
        </p>
        {dados.foraApp == null && (
          <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
            Já fez peregrinações sem o app? Informe em{" "}
            <Link href="/perfil/credencial" className="font-semibold text-amber-700 underline dark:text-amber-500">
              Minha credencial
            </Link>
            .
          </p>
        )}
        {nivel.proximo && (
          <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
            Falta{nivel.proximo.faltam > 1 ? "m" : ""} {nivel.proximo.faltam} peregrinaç
            {nivel.proximo.faltam > 1 ? "ões" : "ão"} para <strong>{nivel.proximo.nome}</strong>.
          </p>
        )}
        <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
          O nível também aparece na sua credencial.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-500">
          Medalhas — {ganhas} de {medalhas.length}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {medalhas.map((m) => (
            <li
              key={m.id}
              className={`card flex flex-col items-center gap-1 text-center ${
                m.conquistada ? "border-amber-300 dark:border-amber-800" : "opacity-60"
              }`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${
                  m.conquistada ? "bg-amber-100 dark:bg-amber-950/50" : "bg-neutral-100 grayscale dark:bg-neutral-800"
                }`}
                aria-hidden="true"
              >
                {m.emoji}
              </span>
              <span className="text-sm font-bold">{m.nome}</span>
              <span className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
                {m.descricao}
              </span>
              <span
                className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
                  m.conquistada ? "text-green-700 dark:text-green-400" : "text-neutral-500"
                }`}
              >
                {m.conquistada ? "Conquistada" : (
                  <>
                    <Lock size={11} /> A conquistar
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">Níveis do peregrino</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {TODOS_NIVEIS.map((n) => (
            <li key={n.nome} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: n.cor }} aria-hidden="true" />
              <span style={{ textAlign: "left" }}>
                <strong>{n.nome}</strong> <span className="text-neutral-500">— {n.descricao}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
