import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MapPin, MapPinPlus, Route, ShieldCheck, Users, Footprints, CheckCircle2, Award } from "lucide-react";
import CompartilharInstalarCard from "@/components/CompartilharInstalarCard";

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
  ];

  const cardsDepoisCompartilhar = [
    {
      href: "/verificar",
      icon: ShieldCheck,
      title: "Verificar certificado",
      desc: "Confirme a autenticidade de um certificado de peregrinação.",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-center gap-5 rounded-2xl bg-gradient-to-br from-amber-800 to-amber-900 p-6 text-white sm:p-8">
        <Image
          src="/icons/logo-emblema.png"
          alt="Emblema do Peregrino"
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
        <section className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="card">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <Users size={20} /> {stats.peregrinos_ativos}
            </p>
            <p className="text-xs text-neutral-500">peregrinos ativos</p>
          </div>
          <div className="card">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <CheckCircle2 size={20} /> {stats.checkins_total}
            </p>
            <p className="text-xs text-neutral-500">check-ins realizados</p>
          </div>
          <div className="card">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <MapPin size={20} /> {stats.pontos_apoio_ativos}
            </p>
            <p className="text-xs text-neutral-500">PAP ativos</p>
          </div>
          <div className="card">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <Award size={20} /> {stats.peregrinacoes_concluidas}
            </p>
            <p className="text-xs text-neutral-500">peregrinações concluídas</p>
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
        {cardsDepoisCompartilhar.map((c) => (
          <Link key={c.href} href={c.href} className="card transition hover:border-amber-300">
            <c.icon className="mb-3 text-amber-700" size={26} />
            <h2 className="mb-1 font-bold">{c.title}</h2>
            <p className="text-sm text-neutral-500">{c.desc}</p>
          </Link>
        ))}
      </section>

      <p className="text-center text-xs text-neutral-400">
        Em caso de emergência, use o botão vermelho no canto da tela para
        ligar direto para PM, PRF, Bombeiros ou SAMU.
      </p>
    </div>
  );
}
