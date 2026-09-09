"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, MapPin, Route, User, LogOut, Home, Footprints, ShieldCheck, Church, MapPinPlus } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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
  const [isGerente, setIsGerente] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function checarPapel(
      userId: string | undefined,
      metadata: Record<string, unknown> | undefined
    ) {
      if (!userId) {
        setIsAdmin(false);
        setIsGerente(false);
        return;
      }
      const [{ data: perfil }, { data: gerente }] = await Promise.all([
        supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle(),
        supabase.from("gerentes_pap").select("id").eq("id", userId).maybeSingle(),
      ]);
      setIsAdmin(!!perfil?.is_admin);
      setIsGerente(!!gerente || metadata?.tipo_conta === "gerente_pap");
    }

    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      checarPapel(data.user?.id, data.user?.user_metadata);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user);
      checarPapel(session?.user?.id, session?.user?.user_metadata);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Contas de Gerente de PAP ficam restritas à própria área — não veem os
  // itens de navegação de peregrino ("Minha peregrinação" / "Perfil").
  const baseLinks = isGerente
    ? [
        { href: "/", label: "Início", icon: Home },
        { href: "/mapa", label: "Mapa", icon: MapPin },
        { href: "/rotas", label: "Rotas", icon: Route },
        { href: "/gerente-pap", label: "Meu PAP", icon: MapPinPlus },
      ]
    : LINKS;

  const links = isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin", icon: ShieldCheck }]
    : baseLinks;

  async function handleLogout() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
          <Image
            src="/icons/icon-192.png"
            alt="Símbolo do Peregrino"
            width={28}
            height={28}
            className="rounded-md"
          />
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
          <ThemeToggle />
          <Church
            className="ml-1 text-amber-800 dark:text-amber-500"
            size={24}
            aria-label="Basílica de Aparecida"
          />
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <Church className="text-amber-800 dark:text-amber-500" size={22} aria-label="Basílica de Aparecida" />
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
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
