"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthRole } from "./AuthRoleProvider";
import ThemeToggle from "./ThemeToggle";

// Barra superior enxuta: marca do app à esquerda; à direita, a foto/nome do
// peregrino com atalho para editar o perfil e sair — ou "Entrar" para quem
// não está logado. A navegação principal (Início/Mapa/Rotas/...) mora no
// menu inferior (BottomNav), não aqui.
export default function Navbar() {
  const { loading, loggedIn, nomeCompleto, avatarUrl } = useAuthRole();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
          <Image
            src="/icons/icon-192.png"
            alt="Símbolo do Peregrino"
            width={30}
            height={30}
            className="rounded-lg"
          />
          <span className="hidden sm:inline">Peregrino</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loading ? null : loggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/perfil"
                className="flex items-center gap-2 rounded-full pr-1 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                title="Editar perfil"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Sua foto"
                    className="h-8 w-8 rounded-full border border-amber-200 object-cover dark:border-amber-900"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                    <UserRound size={18} />
                  </span>
                )}
                <span className="hidden max-w-[8rem] truncate text-sm font-medium text-neutral-700 sm:inline dark:text-neutral-200">
                  {nomeCompleto ?? "Editar perfil"}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Sair"
                title="Sair"
                className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
