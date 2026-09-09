import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MapPin, Route, Footprints, ShieldCheck, Users } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: stats } = (await supabase
    .rpc("estatisticas_publicas")
    .maybeSingle()) as {
    data: {
      peregrinos_ativos: number;
      checkins_hoje: number;
      pontos_apoio_ativos: number;
    } | null;
  };

  const cards = [
    {
      href: "/mapa",
      icon: MapPin,
      title: "Mapa de pontos de apoio",
      desc: "Veja e cadastre pontos de água, alimentação, descanso e doações ao longo da rota.",
    },
    {
      href: "/rotas",
      icon: Route,
      title: "Rotas seguras",
      desc: "Saiba qual lado da rodovia seguir e onde ficam os pontos de maior risco.",
    },
    {
      href: "/peregrinacao",
      icon: Footprints,
      title: "Minha peregrinação",
      desc: "Inicie sua caminhada, compartilhe localização e faça check-in nos pontos.",
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
        <section className="grid grid-cols-3 gap-3 text-center">
          <div className="card">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
              <Users size={20} /> {stats.peregrinos_ativos}
            </p>
            <p className="text-xs text-neutral-500">peregrinos ativos agora</p>
          </div>
          <div className="card">
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">
              {stats.checkins_hoje}
            </p>
            <p className="text-xs text-neutral-500">check-ins hoje</p>
          </div>
          <div className="card">
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-500">
              {stats.pontos_apoio_ativos}
            </p>
            <p className="text-xs text-neutral-500">pontos de apoio</p>
          </div>
        </section>
      )}

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
