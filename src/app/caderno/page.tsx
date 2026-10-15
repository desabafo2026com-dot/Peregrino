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

  const [{ data: carimbosData }, { data: peregrinacoesData }, { data: perfil }, { data: certificadosData }] = await Promise.all([
    supabase
      .from("carimbos_caderno")
      .select("id, peregrinacao_id, pap_nome, cidade, km, carimbado_em, imagem_url")
      .eq("user_id", user.id)
      .order("carimbado_em", { ascending: true }),
    supabase
      .from("peregrinacoes")
      .select("id, status, data_inicio, data_fim, cidade_origem, cidade_inicio")
      .eq("user_id", user.id)
      .order("data_inicio", { ascending: false }),
    supabase.from("profiles").select("nome_completo, cidade, uf").eq("id", user.id).maybeSingle(),
    // Rodada 73 — o carimbo de chegada só aparece para quem chegou em
    // Aparecida (peregrinação concluída com certificado emitido).
    supabase.from("certificados").select("peregrinacao_id").eq("user_id", user.id),
  ]);
  const comCertificado = new Set(((certificadosData ?? []) as { peregrinacao_id: string }[]).map((c) => c.peregrinacao_id));
  const normalizar = (t: string | null | undefined) =>
    (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const nome = (perfil?.nome_completo as string | undefined) ?? "Peregrino";
  const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const carimbos = (carimbosData ?? []) as CarimboComPeregrinacao[];
  const encerradas = ((peregrinacoesData ?? []) as {
    id: string;
    status: string;
    data_inicio: string | null;
    data_fim: string | null;
    cidade_origem: string | null;
    cidade_inicio: string | null;
  }[]).filter((p) => p.status !== "planejada" && p.status !== "em_andamento");
  const grupos = encerradas
    .map((p) => ({ p, lista: carimbos.filter((c) => c.peregrinacao_id === p.id) }))
    .filter((g) => g.lista.length > 0 || (g.p.status === "concluida" && !!g.p.data_inicio));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <VoltarButton href="/painel" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <BookOpen size={24} className="text-amber-700" /> Caderno de bordo
      </h1>
      {grupos.length === 0 ? (
        <p className="card text-sm text-neutral-500">
          Os carimbos (saída, PAPs e chegada) aparecem aqui depois que a peregrinação é encerrada. A peregrinação em andamento tem o
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
              capa={{
                nome,
                ano,
                origem: origem ?? null,
                periodo:
                  p.data_inicio && p.data_fim
                    ? `${dataBr(p.data_inicio)} a ${dataBr(p.data_fim)}`
                    : p.data_inicio
                      ? `Início em ${dataBr(p.data_inicio)}`
                      : null,
                saida:
                  p.data_inicio && origem
                    ? {
                        cidade: origem,
                        uf: perfil?.uf && normalizar(origem) === normalizar(perfil.cidade as string | null) ? (perfil.uf as string) : null,
                        iso: p.data_inicio,
                      }
                    : null,
                chegadaIso: p.status === "concluida" && p.data_fim && comCertificado.has(p.id) ? p.data_fim : null,
              }}
            />
          );
        })
      )}
    </div>
  );
}
