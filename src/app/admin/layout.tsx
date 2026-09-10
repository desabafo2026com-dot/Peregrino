import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import {
  ShieldAlert,
  LayoutDashboard,
  MapPinPlus,
  MapPinned,
  TriangleAlert,
  Route,
  Users,
  UserCog,
} from "lucide-react";

// "Locais de risco" fica só perto do mapa (mesmo destino de "Cadastrar PAP"
// na home) — mantê-lo aqui também seria redundante.
const ADMIN_LINKS = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/pap/novo", label: "Cadastrar PAP", icon: MapPinPlus },
  { href: "/admin/pap", label: "Aprovar PAP", icon: MapPinned },
  { href: "/admin/gerentes", label: "Gerentes de PAP", icon: Users },
  { href: "/admin/rotas", label: "Rotas (Norte/Sul)", icon: Route },
  { href: "/admin/equipe", label: "Equipe (admins/agentes)", icon: UserCog },
];

// Agentes só têm acesso ao painel (leitura) e à inserção de trechos/locais
// de risco — as demais páginas administrativas continuam exclusivas do
// administrador (cada página confere isso de novo por segurança).
const LINKS_AGENTE = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/riscos/novo", label: "Locais de risco", icon: TriangleAlert },
  { href: "/admin/rotas", label: "Trechos de risco", icon: Route },
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
          Esta área é reservada aos administradores e agentes do Peregrino.
          Se você ajuda a manter pontos de apoio ou informações de segurança
          na rota e deveria ter acesso, fale com a equipe do Peregrino.
        </p>
        <Link href="/" className="btn-secondary inline-block">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const links = perfil.is_admin ? ADMIN_LINKS : LINKS_AGENTE;

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
      <nav className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <l.icon size={16} /> {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
