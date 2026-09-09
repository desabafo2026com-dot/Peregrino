import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPin, MapPinPlus, Route, ShieldCheck, Users, Footprints, CheckCircle2, Award } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const cards = [
    {
      href: "/mapa",
      icon: MapPin,
      title: "Mapa de PAP",
      desc: "Veja os PAP (Pontos de Apoio ao Peregrino) — água, alimentação, descanso e doações ao longo da rota.",
    },
    {
      href: "/gerente-pap/cadastro",
      icon: MapPinPlus,
      title: "Cadastre seu PAP",
      desc: "Cadastro para gerentes de PAP: cadastre-se, confirme seu e-mail e cadastre seu Ponto de Apoio ao Peregrino — ele aparece no mapa após aprovação da administração.",
    },
    {
      href: "/rotas",
      icon: Route,
      title: "Rotas de peregrinação",
      desc: "Rota Norte (São Paulo) ou Sul (Rio de Janeiro) até Aparecida: qual lado da rodovia seguir e pontos de maior risco.",
    },
    {
      href: "/verificar",
      icon: ShieldCheck,
      title: "Verificar certificado",
      desc: "Confirme a autenticidade de um certificado de peregrinação.",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-gradient-to-br from-amber-800 to-amber-900 p-8 text-white">
        <h1 className="mb-2 text-3xl font-bold">Boa caminhada, peregrino! 🥾</h1>
        <p className="max-w-xl text-amber-100">
          Informações de apoio, rotas seguras e emergência para quem caminha
          pela Rodovia Presidente Dutra até Aparecida-SP.
        </p>
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
        href={user ? "/peregrinacao" : "/login"}
        className="flex items-center justify-center gap-2 rounded-2xl bg-amber-700 py-4 text-lg font-bold text-white shadow-sm hover:bg-amber-800"
      >
        <Footprints size={22} />
        {user ? "MINHA PEREGRINAÇÃO" : "SOU PEREGRINO — ENTRAR"}
      </Link>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
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
