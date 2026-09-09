"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, MapPin, Route, User, LogOut, Home, Footprints, ShieldCheck } from "lucide-react";

const LINKS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/mapa", label: "Mapa", icon: MapPin },
  { href: "/rotas", label: "Rotas", icon: Route },
  { href: "/peregrinacao", label: "Minha peregrinação", icon: Footprints },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function checarAdmin(userId: string | undefined) {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();
      setIsAdmin(!!data?.is_admin);
    }

    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      checarAdmin(data.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
      checarAdmin(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const links = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : LINKS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
          <Footprints size={22} />
          Peregrino
        </Link>

        <nav className="hidden gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === l.href
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {loggedIn === false && (
            <Link
              href="/login"
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Entrar
            </Link>
          )}
          {loggedIn === true && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <LogOut size={16} /> Sair
            </button>
          )}
        </nav>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-neutral-200 px-4 py-3 md:hidden dark:border-neutral-800">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === l.href
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
                  : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              <l.icon size={18} /> {l.label}
            </Link>
          ))}
          {loggedIn === false && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-amber-700 px-3 py-2 text-center text-sm font-medium text-white"
            >
              Entrar
            </Link>
          )}
          {loggedIn === true && (
            <button
              onClick={handleLogout}
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 dark:text-neutral-300"
            >
              <LogOut size={16} /> Sair
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
