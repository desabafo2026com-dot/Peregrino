import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import {
  ShieldAlert,
  LayoutDashboard,
  BarChart3,
  MapPinPlus,
  MapPinned,
  TriangleAlert,
  Route,
  Users,
  UserCog,
  MessageCircle,
  Sparkles,
  Ticket,
  Hotel,
  Megaphone,
} from "lucide-react";

// "Locais de risco" fica só perto do mapa (mesmo destino de "Cadastrar PAP"
// na home) — mantê-lo aqui também seria redundante. "Rotas (Norte/Sul)"
// saiu do menu do administrador — era uma ferramenta antiga de trechos de
// segurança que não reflete mais como o app mostra risco (por ponto, não
// por trecho); continua existindo só para o agente cadastrar trechos.
// "Cadastrar hotel/restaurante" (Rodada 22) foi movido para cá, ao lado de
// "Cadastrar PAP", a pedido do usuário — antes só existia lá embaixo, na
// seção "Hotéis e Restaurantes" do painel, e passava despercebido.
// Rodada 26: menu reorganizado em linhas por assunto (pedido do usuário:
// "organizar melhor o menu do adm em linha e por assunto") — antes era uma
// única lista corrida sem nenhum agrupamento visual. Os botões avulsos de
// "Cadastrar local de risco" / "Editar/excluir locais de risco" que ficavam
// dentro do painel (seção Riscos) foram removidos dali nesta mesma rodada,
// já que "Locais de risco" aqui no menu principal cobre exatamente as
// mesmas ações (cadastrar, editar e excluir), uma seção logo abaixo.
const ADMIN_LINK_GROUPS = [
  {
    titulo: "Geral",
    links: [
      { href: "/admin", label: "Painel", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Dashboard de métricas", icon: BarChart3 },
    ],
  },
  {
    titulo: "Pontos de apoio",
    links: [
      { href: "/admin/pap/novo", label: "Cadastrar PAP", icon: MapPinPlus },
      { href: "/admin/pap", label: "Aprovar PAP", icon: MapPinned },
      { href: "/admin/gerentes", label: "Gerentes de PAP", icon: Users },
    ],
  },
  {
    titulo: "Hospedagem",
    links: [{ href: "/admin/hospedagem", label: "Cadastrar hotel/restaurante", icon: Hotel }],
  },
  {
    titulo: "Riscos",
    links: [{ href: "/admin/riscos", label: "Locais de risco", icon: TriangleAlert }],
  },
  {
    titulo: "Romaria Plus",
    links: [
      { href: "/admin/romaria-plus", label: "Romaria Plus", icon: Sparkles },
      { href: "/admin/cupons-romaria-plus", label: "Cupons Romaria Plus", icon: Ticket },
    ],
  },
  {
    titulo: "Suporte e equipe",
    links: [
      { href: "/admin/mensagens", label: "Falar com o desenvolvedor", icon: MessageCircle },
      { href: "/admin/mensagens-conquista", label: "Mensagens de conquista", icon: Megaphone },
      { href: "/admin/equipe", label: "Equipe (admins/agentes)", icon: UserCog },
    ],
  },
];

// Agentes só têm acesso ao painel (leitura) e à inserção de trechos/locais
// de risco — as demais páginas administrativas continuam exclusivas do
// administrador (cada página confere isso de novo por segurança).
const LINK_GROUPS_AGENTE = [
  {
    titulo: "Geral",
    links: [{ href: "/admin", label: "Painel", icon: LayoutDashboard }],
  },
  {
    titulo: "Riscos",
    links: [
      { href: "/admin/riscos/novo", label: "Locais de risco", icon: TriangleAlert },
      { href: "/admin/rotas", label: "Trechos de risco", icon: Route },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin, is_agente, nome_completo")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.is_admin && !perfil?.is_agente) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/" />
        <ShieldAlert className="mx-auto mb-4 text-amber-700" size={40} />
        <h1 className="mb-2 text-xl font-bold">Área restrita</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Esta área é reservada aos administradores e agentes do app O Peregrino.
          Se você ajuda a manter pontos de apoio ou informações de segurança
          na rota e deveria ter acesso, fale com a equipe do app O Peregrino.
        </p>
        <Link href="/" className="btn-secondary inline-block">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const grupos = perfil.is_admin ? ADMIN_LINK_GROUPS : LINK_GROUPS_AGENTE;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          {perfil.is_admin ? "Administração" : "Painel do agente"}
        </h1>
        <p className="text-sm text-neutral-500">
          Olá, {perfil.nome_completo?.split(" ")[0] ?? (perfil.is_admin ? "administrador" : "agente")}
          {perfil.is_admin
            ? " — gerencie PAP, gerentes, locais de risco e rotas de peregrinação."
            : " — você pode visualizar o painel e o mapa, e cadastrar trechos e locais de risco."}
        </p>
      </div>
      <nav className="flex flex-col gap-3">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {grupo.titulo}
            </p>
            <div className="flex flex-wrap gap-2">
              {grupo.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  <l.icon size={16} /> {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {children}
    </div>
  );
}
