import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldAlert, LayoutDashboard, MapPinPlus, TriangleAlert, Route, Users } from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/pap/novo", label: "Cadastrar PAP", icon: MapPinPlus },
  { href: "/admin/gerentes", label: "Gerentes de PAP", icon: Users },
  { href: "/admin/riscos/novo", label: "Locais de risco", icon: TriangleAlert },
  { href: "/admin/rotas", label: "Rotas (Sul/Norte)", icon: Route },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin, nome_completo")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.is_admin) {
    return (
      <div className="mx-auto max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 text-amber-700" size={40} />
        <h1 className="mb-2 text-xl font-bold">Área restrita</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Esta área é reservada aos administradores de PAP (Pontos de Apoio
          ao Peregrino) e locais de risco. Se você ajuda a manter pontos de
          apoio na rota e deveria ter acesso, fale com a equipe do Peregrino
          para se tornar um administrador.
        </p>
        <Link href="/" className="btn-secondary inline-block">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-neutral-500">
          Olá, {perfil.nome_completo?.split(" ")[0] ?? "administrador"} — gerencie PAP, locais de risco e rotas de peregrinação.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {ADMIN_LINKS.map((l) => (
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
