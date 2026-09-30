import Link from "next/link";
import { redirect } from "next/navigation";
import {
  UserRound,
  IdCard,
  Award,
  Camera,
  Tent,
  Footprints,
  ChevronRight,
  Sparkles,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ModelosPlusVitrine from "@/components/ModelosPlusVitrine";
import RomariaPlusComprarExtra from "@/components/RomariaPlusComprarExtra";
import { ROMARIA_PLUS_VALOR_CENTAVOS } from "@/lib/constants";
import type { CompraRomariaPlus, Profile, RomariaPlusFoto } from "@/types/database";

export const metadata = {
  title: "Meu painel — O Peregrino",
};

// Rodada 56 — painel inicial do peregrino: é para onde a pessoa vai depois
// de entrar na conta e depois de completar o perfil pela primeira vez.
// Reúne os módulos pessoais: Perfil, Minha credencial, Meus certificados,
// Minhas fotos (Romaria Plus) e, para quem também é gerente, Meu PAP.

interface CompraResumo {
  id: string;
  certificado_id: string;
  tipo: string;
  compra_pai_id: string | null;
}

function Modulo({
  href,
  titulo,
  descricao,
  Icone,
  cor,
}: {
  href: string;
  titulo: string;
  descricao: string;
  Icone: typeof UserRound;
  cor: { fundo: string; icone: string };
}) {
  return (
    <Link
      href={href}
      className="card flex items-center gap-4 transition hover:border-amber-400"
    >
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: cor.fundo, color: cor.icone }}
      >
        <Icone size={28} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-neutral-900 dark:text-neutral-100">{titulo}</span>
        <span className="block text-sm text-neutral-500 dark:text-neutral-400">{descricao}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-neutral-400" />
    </Link>
  );
}

const VALOR_PLUS = `R$ ${(ROMARIA_PLUS_VALOR_CENTAVOS / 100).toFixed(2).replace(".", ",")}`;
const AZUL = { fundo: "#1f3b6b", icone: "#f5a54a" };
const OURO = { fundo: "#e0892b", icone: "#ffffff" };
const CREME = { fundo: "#fbe3c9", icone: "#b8621a" };

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/painel");

  const [{ data: perfilData }, { data: gerente }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("gerentes_pap").select("id").eq("id", user.id).maybeSingle(),
  ]);
  const perfil = perfilData as Profile | null;
  const ehGerente = !!gerente || user.user_metadata?.tipo_conta === "gerente_pap";

  // Sem perfil de peregrino completo: conta só de gerente vai para a área
  // dela; peregrino novo termina o cadastro primeiro.
  if (!perfil?.cidade) {
    if (ehGerente && !perfil) redirect("/gerente-pap");
    redirect("/perfil");
  }

  const [{ data: certificados }, { data: ativa }, { data: cracha }, { data: comprasData }] = await Promise.all([
    supabase
      .from("certificados")
      .select("id, emitido_em")
      .eq("user_id", user.id)
      .order("emitido_em", { ascending: false }),
    supabase
      .from("peregrinacoes")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["planejada", "em_andamento"])
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("crachas_peregrino").select("codigo").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("compras_romaria_plus")
      .select("id, certificado_id, tipo, compra_pai_id, criado_em")
      .eq("user_id", user.id)
      .eq("status", "pago")
      .order("criado_em", { ascending: false }),
  ]);

  const compras = (comprasData ?? []) as CompraResumo[];
  const compraPlus = compras.find((c) => c.tipo === "inicial") ?? null;
  const pacotesExtra = compraPlus ? compras.filter((c) => c.tipo === "extra" && c.compra_pai_id === compraPlus.id).length : 0;
  const maxFotos = 5 + 5 * pacotesExtra;

  let artesSalvas: RomariaPlusFoto[] = [];
  let pacoteExtraPendente: CompraRomariaPlus | null = null;
  if (compraPlus) {
    const [{ data: fotosData }, { data: pendenteData }] = await Promise.all([
      supabase.from("romaria_plus_fotos").select("*").eq("compra_id", compraPlus.id).order("indice"),
      // Pacote extra (+5) ainda confirmando pagamento, se houver.
      supabase
        .from("compras_romaria_plus")
        .select("*")
        .eq("compra_pai_id", compraPlus.id)
        .eq("tipo", "extra")
        .eq("status", "pendente")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    artesSalvas = ((fotosData ?? []) as RomariaPlusFoto[]).filter((f) => !!f.arte_url);
    pacoteExtraPendente = (pendenteData as CompraRomariaPlus | null) ?? null;
  }

  const qtdCertificados = certificados?.length ?? 0;
  const ultimoCertificadoId = (certificados?.[0]?.id as string | undefined) ?? null;
  const primeiroNome = perfil.nome_completo.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-4">
        {perfil.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfil.avatar_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-amber-500"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <UserRound size={32} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">Olá, {primeiroNome}!</h1>
          <p className="text-sm text-neutral-500">Este é o seu painel de peregrino.</p>
        </div>
      </header>

      <Link
        href="/peregrinacao"
        className="flex items-center gap-4 rounded-2xl p-4 text-white shadow-md transition hover:brightness-110"
        style={{ background: "linear-gradient(135deg, #1f3b6b 0%, #2c4f8a 55%, #e0892b 140%)" }}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15" style={{ color: "#f5a54a" }}>
          <Footprints size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">
            {ativa?.status === "em_andamento"
              ? "Peregrinação em andamento"
              : ativa?.status === "planejada"
                ? "Peregrinação planejada"
                : "Minha peregrinação"}
          </span>
          <span className="block text-sm text-white/80">
            {ativa?.status === "em_andamento"
              ? "Continuar a caminhada, check-ins e mapa"
              : ativa?.status === "planejada"
                ? "Ver o planejamento e iniciar quando chegar a hora"
                : "Planejar uma nova caminhada até Aparecida"}
          </span>
        </span>
        <ChevronRight size={22} className="shrink-0 text-white/80" />
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        <Modulo href="/perfil" titulo="Perfil" descricao="Seus dados, foto e senha" Icone={UserRound} cor={AZUL} />
        <Modulo
          href="/perfil/credencial"
          titulo="Minha credencial"
          descricao={cracha?.codigo ? `Crachá ${cracha.codigo} para imprimir` : "Monte seu crachá para a mochila"}
          Icone={IdCard}
          cor={OURO}
        />
        <Modulo
          href="/certificado"
          titulo="Meus certificados"
          descricao={
            qtdCertificados > 0
              ? `${qtdCertificados} certificado${qtdCertificados > 1 ? "s" : ""} e peregrinações concluídas`
              : "Aparecem aqui ao concluir a peregrinação"
          }
          Icone={Award}
          cor={CREME}
        />
        {ehGerente && (
          <Modulo href="/gerente-pap" titulo="Meu PAP" descricao="Seu Ponto de Apoio ao Peregrino" Icone={Tent} cor={AZUL} />
        )}
      </div>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: OURO.fundo, color: OURO.icone }}
          >
            <Camera size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-bold">
              Minhas fotos
              <span className="rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                Plus
              </span>
            </h2>
            <p className="text-sm text-neutral-500">
              {compraPlus
                ? `${artesSalvas.length} de ${maxFotos} artes salvas`
                : "Sua foto da peregrinação em artes exclusivas"}
            </p>
          </div>
        </div>

        {compraPlus ? (
          <>
            {artesSalvas.length === 0 && (
              <>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-500">Use suas fotos para criar a arte</p>
                <ModelosPlusVitrine />
              </>
            )}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: Math.max(5, artesSalvas.length) }, (_, i) => artesSalvas[i] ?? null).map((f, i) =>
                f ? (
                  <Link key={f.id || i} href={`/certificado/plus/${compraPlus.certificado_id}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.arte_url as string}
                      alt={`Foto ${f.indice}`}
                      loading="lazy"
                      className="aspect-[9/16] w-full rounded-lg object-cover shadow-sm"
                    />
                  </Link>
                ) : (
                  <Link
                    key={`vazio-${i}`}
                    href={`/certificado/plus/${compraPlus.certificado_id}`}
                    className="flex aspect-[9/16] w-full items-center justify-center rounded-lg border-2 border-dashed border-amber-300 text-amber-600 dark:border-amber-800"
                    aria-label="Criar nova arte"
                  >
                    <Plus size={18} />
                  </Link>
                )
              )}
            </div>
            <Link
              href={`/certificado/plus/${compraPlus.certificado_id}`}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />{" "}
              {artesSalvas.length === 0
                ? "Criar minha primeira arte"
                : artesSalvas.length < maxFotos
                  ? "Criar e ver minhas artes"
                  : "Ver minhas artes"}
            </Link>
            {/* Rodada 57 — completou as artes liberadas: oferece mais 5. */}
            {(artesSalvas.length >= maxFotos || pacoteExtraPendente) && (
              <RomariaPlusComprarExtra compraId={compraPlus.id} pacoteExtraPendenteInicial={pacoteExtraPendente} />
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-500">Use suas fotos para criar a arte</p>
            <ModelosPlusVitrine />
            <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
              Com a <strong>Romaria Plus</strong> você transforma <strong>5 fotos</strong> da sua caminhada em
              artes para guardar e compartilhar e ganha o <strong>Certificado Plus</strong>. Usou as 5? Dá para
              comprar mais 5.
            </p>
            {ultimoCertificadoId ? (
              <Link
                href={`/certificado#romaria-plus-${ultimoCertificadoId}`}
                className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-800 px-6 py-3 text-white shadow-md transition hover:from-amber-700 hover:to-amber-900"
              >
                <span className="flex items-center gap-2 text-lg font-black">
                  <Sparkles size={18} /> Adquirir por {VALOR_PLUS}
                </span>
                <span className="text-sm font-semibold text-amber-50">5 artes com suas fotos + Certificado Plus</span>
              </Link>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300" style={{ textAlign: "left" }}>
                Fica disponível assim que você concluir sua peregrinação e receber o certificado.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
