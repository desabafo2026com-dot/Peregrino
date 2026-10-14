import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MapPin, MapPinPlus, Route, Footprints, Hotel, Smartphone, ShieldCheck, Tent, Sparkles, Siren, SearchCheck } from "lucide-react";
import CompartilharInstalarCard from "@/components/CompartilharInstalarCard";
import SigaNosRedes from "@/components/SigaNosRedes";
import BotaoInstalarApp from "@/components/BotaoInstalarApp";
import DoacaoCard from "@/components/DoacaoCard";
import ModelosPlusVitrine from "@/components/ModelosPlusVitrine";
import IconePeregrinosFila from "@/components/IconePeregrinosFila";
import MensagensConquistaCarrossel from "@/components/MensagensConquistaCarrossel";
import MuralCarrossel from "@/components/MuralCarrossel";
import { itensAgradecimentosPap, itensIntencoes } from "@/lib/mural";
import { carregarHomePublica } from "@/lib/home-publico";
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

  // Rodada 65b — dados públicos da home em cache de 60 s (ver lib/home-publico.ts).
  const homePublica = await carregarHomePublica();
  const stats = homePublica.stats;
  const numero = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");

  const itensMural = itensIntencoes(homePublica.mural);
  const itensPap = itensAgradecimentosPap(homePublica.agradecimentos);

  // Romarias em grupo já aprovadas pela administração, ordenadas da data de
  // início mais próxima para a mais distante — RLS já garante que só vêm
  // as aprovadas (romarias_grupo_select_publico), o filtro por data abaixo
  // decide quais ainda valem a pena mostrar (ver romariaAindaAtivaOuFutura).
  const romariasGrupo = homePublica.romarias.filter(romariaAindaAtivaOuFutura);

  // Mensagens públicas de conquista (Rodada 27) — as 30 mais recentes ainda
  // ativas (a administração pode desativar uma mensagem inadequada sem
  // apagar o registro). Sem expirar por tempo: o próprio limite de 30 já
  // garante que a lista se renova sozinha conforme peregrinos vão
  // concluindo e publicando mensagens novas — pedido explícito do usuário.
  const mensagensConquista = homePublica.mensagensConquista;

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
      // Rodada 59 — sem conta, vai para a escolha "Sou peregrino / gerente /
      // organizador" (/cadastro): todos precisam de cadastro.
      href: isGerente ? "/gerente-pap" : user ? "/gerente-pap/cadastro" : "/cadastro",
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
      // Rodada 27: "Romaria em Grupo" renomeada para "Romaria de
      // Peregrinos" em todo o app, a pedido do usuário — o card da home
      // virou a chamada "Sou organizador de Romaria a pé"; o cadastro em si
      // continua sendo puramente informativo, sem exigir nada além de já
      // estar logado.
      href: user ? "/romarias-grupo/cadastro" : "/cadastro",
      icon: IconePeregrinosFila,
      title: "Sou organizador de Romaria",
      desc: "Cadastre sua Romaria para que autoridades, Pontos de Apoio e outros peregrinos saibam que seu grupo estará na estrada.",
    },
    {
      href: "/hospedagem",
      icon: Hotel,
      title: "Hotéis e Restaurantes",
      desc: "Opções de hospedagem e alimentação ao longo da rodovia, com mapa e filtro por tipo.",
    },
    {
      // Rodada 68
      href: "/ocorrencias",
      icon: Siren,
      title: "Ocorrências na Dutra",
      desc: "O que já aconteceu na rodovia (acidentes, assaltos, atropelamentos...) para você redobrar o cuidado. Registre também o que você viu.",
    },
    {
      href: "/achados-perdidos",
      icon: SearchCheck,
      title: "Achados e perdidos",
      desc: "Perdeu ou achou algo no caminho? Publique aqui e ajude a devolver ao dono.",
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

      {/* Rodada 41 — para quem chega por um link de grupo e ainda não tem
          conta: deixa claro logo de cara que dá para usar o essencial sem
          cadastro (parte do público tinha receio de se cadastrar num app
          fora da loja) e aponta para a página que responde essa dúvida. */}
      {!user && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="mb-1 font-bold text-amber-900 dark:text-amber-200">
            Consulte sem cadastro
          </p>
          <p className="mb-3 text-sm text-neutral-700 dark:text-neutral-300">
            O mapa de Pontos de Apoio, as rotas com os trechos de risco e os hotéis e restaurantes
            estão liberados para qualquer pessoa. Para registrar sua peregrinação ou informar algo
            (Romaria, PAP, ocorrências no trajeto) é preciso ter cadastro.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/mapa" className="btn-primary inline-flex items-center gap-1.5 text-sm">
              <MapPin size={16} /> Ver o mapa agora
            </Link>
            <Link href="/seguro" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
              <ShieldCheck size={16} /> O app é seguro?
            </Link>
          </div>
        </section>
      )}

      {/* Rodada 67 — contadores de acessos ao app saíram da página inicial
          (continuam no painel do administrador). O primeiro botão é o de
          instalar no telefone; abaixo, os números de PAP. */}
      <section className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
        <BotaoInstalarApp className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-800 px-2 py-3 text-white shadow-sm transition hover:from-amber-700 hover:to-amber-900 sm:col-span-1 dark:from-amber-700 dark:to-amber-900">
          <Smartphone size={22} />
          <span className="text-sm leading-tight font-bold" style={{ textAlign: "center" }}>
            Instalar no telefone
          </span>
        </BotaoInstalarApp>
        {stats && (
          <>
            {/* Rodada 60 — toque abre o mapa de PAP já com o filtro "ativos agora". */}
            <Link
              href="/mapa?ativos=1"
              className="card flex flex-col items-center justify-center gap-1 transition hover:border-amber-300"
            >
              <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
                <MapPin size={20} /> {numero(stats.paps_ativos)}
              </p>
              <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
                PAP ativos
              </p>
            </Link>
            <Link
              href="/mapa"
              className="card flex flex-col items-center justify-center gap-1 transition hover:border-amber-300"
            >
              <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-800 dark:text-amber-500">
                <Tent size={20} /> {numero(stats.paps_total)}
              </p>
              <p className="text-xs text-neutral-500" style={{ textAlign: "center" }}>
                PAPs no mapa
              </p>
            </Link>
          </>
        )}
      </section>

      {/* Rodada 67 — romarias logo abaixo dos contadores, em cima das mensagens de conquista. */}
      {romariasGrupo.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-500">
            <IconePeregrinosFila size={20} /> Romarias de Peregrinos na estrada
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

      {mensagensConquista.length > 0 && <MensagensConquistaCarrossel mensagens={mensagensConquista} />}

      {/* Rodada 65 — agradecimentos aos PAPs. */}
      <MuralCarrossel titulo="Agradecimentos aos PAPs" itens={itensPap} verTodosHref="/mural#paps" variante="pap" />

      <MuralCarrossel titulo="Mural de pedidos e agradecimentos" itens={itensMural} verTodosHref="/mural" />

      <Link
        href={!user ? "/cadastro" : isGerente ? "/gerente-pap" : "/peregrinacao"}
        className="flex items-center justify-center gap-2 rounded-2xl bg-amber-700 py-4 text-lg font-bold text-white shadow-sm hover:bg-amber-800"
      >
        <Footprints size={22} />
        {!user
          ? "SOU PEREGRINO"
          : isGerente
            ? "MEU PAP — GERENCIAR"
            : temPeregrinacao
              ? "MINHA PEREGRINAÇÃO"
              : "PLANEJAR PEREGRINAÇÃO"}
      </Link>

      {/* Rodada 67 — chamada para a arte grátis (1ª arte por conta, de qualquer
          ano, mesmo sem ter registrado a peregrinação no app). Sem conta, passa
          pelo cadastro de peregrino antes e volta para Minhas fotos. */}
      {!isGerente && (
        <section className="card flex flex-col gap-3 border-amber-200 dark:border-amber-900">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
              <Sparkles size={20} /> Crie grátis uma arte da sua peregrinação
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
              Já fez a peregrinação? Transforme uma foto sua numa arte como estas, para guardar e compartilhar. A
              primeira é grátis, de qualquer ano.
            </p>
          </div>
          <ModelosPlusVitrine mini />
          <Link
            href={user ? "/fotos" : "/login?tipo=peregrino&redirect=/fotos"}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Sparkles size={18} /> Criar minha arte grátis
          </Link>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {cardsAntesCompartilhar.map((c) => (
          <Link key={c.title} href={c.href} className="card transition hover:border-amber-300">
            <c.icon className="mb-3 text-amber-700" size={26} />
            <h2 className="mb-1 font-bold">{c.title}</h2>
            <p className="text-sm text-neutral-500">{c.desc}</p>
          </Link>
        ))}
        <CompartilharInstalarCard />
        <SigaNosRedes className="sm:col-span-2" />
      </section>

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
        </Link>{" "}
        ·{" "}
        <Link href="/seguro" className="underline">
          O app é seguro?
        </Link>
      </p>
    </div>
  );
}
