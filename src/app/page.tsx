import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MapPin, MapPinPlus, Route, Users, Footprints, CheckCircle2, Award, Hotel, UsersRound } from "lucide-react";
import CompartilharInstalarCard from "@/components/CompartilharInstalarCard";
import DoacaoCard from "@/components/DoacaoCard";
import type { RomariaGrupo } from "@/types/database";

// Uma romaria em grupo aparece na home enquanto ainda não tiver passado do
// último dia previsto (data_inicio + previsao_dias - 1) — inclui tanto as
// que já estão em andamento quanto as que ainda vão começar, nunca as já
// encerradas.
function romariaAindaAtivaOuFutura(r: RomariaGrupo): boolean {
  const fim = new Date(r.data_inicio + "T00:00:00");
  fim.setDate(fim.getDate() + r.previsao_dias - 1);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return fim >= hoje;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isGerente = false;
  let temPeregrinacao = false;
  if (user) {
    const { data: gerente } = await supabase
      .from("gerentes_pap")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    isGerente = !!gerente || user.user_metadata?.tipo_conta === "gerente_pap";

    if (!isGerente) {
      const { data: peregrinacaoAtual } = await supabase
        .from("peregrinacoes")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["planejada", "em_andamento"])
        .maybeSingle();
      temPeregrinacao = !!peregrinacaoAtual;
    }
  }

  const { data: stats } = (await supabase
    .rpc("estatisticas_publicas")
    .maybeSingle()) as {
    data: {
      peregrinos_ativos: number;
      checkins_hoje: number;
      checkins_total: number;
      pontos_apoio_ativos: number;
      peregrinacoes_concluidas: number;
    } | null;
  };

  // Romarias em grupo já aprovadas pela administração, ordenadas da data de
  // início mais próxima para a mais distante — RLS já garante que só vêm
  // as aprovadas (romarias_grupo_select_publico), o filtro por data abaixo
  // decide quais ainda valem a pena mostrar (ver romariaAindaAtivaOuFutura).
  const { data: romariasGrupoData } = await supabase
    .from("romarias_grupo")
    .select("*")
    .eq("status", "aprovado")
    .order("data_inicio", { ascending: true });
  const romariasGrupo = ((romariasGrupoData ?? []) as RomariaGrupo[]).filter(romariaAindaAtivaOuFutura);

  const cardsAntesCompartilhar = [
    {
      href: "/mapa",
      icon: MapPin,
      title: "Mapa de PAP",
      desc: "Veja os PAP (Pontos de Apoio ao Peregrino) — água, alimentação, descanso e doações ao longo da rota.",
    },
    {
      // Já logada (ex.: conta de peregrino) mas ainda não é gerente: vai
      // direto para "virar gerente com esta mesma conta" (/gerente-pap/cadastro)
      // em vez de pedir e-mail/senha de novo em /login — antes disso mandava
      // sempre para /login, obrigando a pessoa já autenticada a passar de
      // novo pela tela de e-mail/senha sem necessidade.
      href: isGerente ? "/gerente-pap" : user ? "/gerente-pap/cadastro" : "/login?tipo=gerente_pap",
      icon: MapPinPlus,
      title: "PAP — vincular ou cadastrar",
      desc: isGerente
        ? "Acesse sua área de gerente para alterar os dados do seu Ponto de Apoio ao Peregrino a qualquer momento."
        : "É gerente de um PAP? Encontre o seu numa lista pública de pontos já conhecidos e vincule com poucos toques, ou cadastre um novo — ele aparece no mapa após aprovação da administração.",
    },
    {
      href: "/rotas",
      icon: Route,
      title: "Rotas de peregrinação",
      desc: "São Paulo - Aparecida ou Rio de Janeiro - Aparecida: dicas de segurança e pontos de maior risco em cada rota.",
    },
    {
      href: "/hospedagem",
      icon: Hotel,
      title: "Hotéis e Restaurantes",
      desc: "Opções de hospedagem e alimentação ao longo da rodovia, com mapa e filtro por tipo.",
    },
    {
      href: user ? "/romarias-grupo/cadastro" : "/login?tipo=peregrino&redirect=/romarias-grupo/cadastro",
      icon: UsersRound,
      title: "Cadastrar Romaria em Grupo",
      desc: "Vai em caravana ou grupo? Informe para que autoridades e outros peregrinos saibam do seu grupo na estrada.",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-center gap-5 rounded-2xl bg-gradient-to-br from-amber-800 to-amber-900 p-6 text-white sm:p-8">
        <Image
          src="/icons/logo-emblema.png"
          alt="Emblema do app O Peregrino"
          width={96}
          height={96}
          className="h-16 w-16 shrink-0 rounded-2xl shadow-lg ring-2 ring-white/30 sm:h-28 sm:w-28"
        />
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Boa caminhada, peregrino!</h1>
          <p className="max-w-xl text-amber-100">
            Informações de apoio, rotas seguras e emergência para quem caminha
            pela Rodovia Presidente Dutra até Aparecida-SP.
          </p>
        </div>
      </section>

      {stats && (
        // Grid de 2 colunas (4 no celular maior/tablet+) em vez do
        // flex-wrap anterior — com 4 cards, o flex-wrap deixava o último
        // sozinho numa segunda linha e esticado (flex-1) em várias larguras
        // de tela intermediárias, ficando desalinhado com os de cima. Um
        // grid de colunas fixas sempre fecha as linhas por igual.
        <section className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="card flex flex-col items-center justify-center gap-1">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <Users size={20} /> {stats.peregrinos_ativos}
            </p>
            {/* Rodada 24: texto centralizado com style inline, não só a
                classe text-center herdada da section — a regra global
                `p { text-align: justify }` (Rodada 13) vence qualquer
                text-align herdado por cascata assim que o texto quebra em
                duas linhas (só não vencia uma classe .text-center direto no
                próprio <p>, como já corrigido em outros lugares desde a
                Rodada 17). "peregrinações concluídas", o rótulo mais
                comprido, é o mais propenso a quebrar em telas estreitas de
                iPhone — por isso o bug só aparecia nesse card. */}
            <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
              peregrinos ativos
            </p>
          </div>
          <div className="card flex flex-col items-center justify-center gap-1">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <CheckCircle2 size={20} /> {stats.checkins_total}
            </p>
            <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
              check-ins realizados
            </p>
          </div>
          <div className="card flex flex-col items-center justify-center gap-1">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <MapPin size={20} /> {stats.pontos_apoio_ativos}
            </p>
            <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
              PAP ativos
            </p>
          </div>
          <div className="card flex flex-col items-center justify-center gap-1">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <Award size={20} /> {stats.peregrinacoes_concluidas}
            </p>
            <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
              peregrinações concluídas
            </p>
          </div>
        </section>
      )}

      <Link
        href={!user ? "/login" : isGerente ? "/gerente-pap" : "/peregrinacao"}
        className="flex items-center justify-center gap-2 rounded-2xl bg-amber-700 py-4 text-lg font-bold text-white shadow-sm hover:bg-amber-800"
      >
        <Footprints size={22} />
        {!user
          ? "SOU PEREGRINO — ENTRAR"
          : isGerente
            ? "MEU PAP — GERENCIAR"
            : temPeregrinacao
              ? "MINHA PEREGRINAÇÃO"
              : "PLANEJAR PEREGRINAÇÃO"}
      </Link>

      <section className="grid gap-4 sm:grid-cols-2">
        {cardsAntesCompartilhar.map((c) => (
          <Link key={c.href} href={c.href} className="card transition hover:border-amber-300">
            <c.icon className="mb-3 text-amber-700" size={26} />
            <h2 className="mb-1 font-bold">{c.title}</h2>
            <p className="text-sm text-neutral-500">{c.desc}</p>
          </Link>
        ))}
        <CompartilharInstalarCard />
      </section>

      {romariasGrupo.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
            <UsersRound size={20} /> Romarias em grupo na estrada
          </h2>
          <div className="flex flex-col gap-2">
            {romariasGrupo.map((r) => {
              const inicio = new Date(r.data_inicio + "T00:00:00");
              const fim = new Date(inicio);
              fim.setDate(fim.getDate() + r.previsao_dias - 1);
              return (
                <div key={r.id} className="card">
                  <p className="font-semibold">{r.nome}</p>
                  <p className="text-xs text-neutral-500">
                    Origem: {r.cidade_origem} — {r.quantidade} pessoa(s) —{" "}
                    {inicio.toLocaleDateString("pt-BR")}
                    {fim.getTime() !== inicio.getTime() ? ` a ${fim.toLocaleDateString("pt-BR")}` : ""}
                    {r.exibir_organizador && r.organizador_nome ? ` — Organizador: ${r.organizador_nome}` : ""}
                    {r.exibir_telefone && r.organizador_telefone ? ` — Tel: ${r.organizador_telefone}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-neutral-400">
        Em caso de emergência, use o botão vermelho no canto da tela para
        ligar direto para PM, PRF, Bombeiros ou SAMU.
      </p>

      <DoacaoCard />

      <p className="text-center text-xs text-neutral-400">
        <Link href="/termos" className="underline">
          Termos de Uso
        </Link>{" "}
        ·{" "}
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>
      </p>
    </div>
  );
}
