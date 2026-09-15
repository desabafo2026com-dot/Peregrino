"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthRoleState {
  loading: boolean;
  loggedIn: boolean;
  isAdmin: boolean;
  isGerente: boolean;
  // Tem uma linha própria em `profiles` — ou seja, em algum momento já usou
  // (ou começou a usar) a conta como peregrino, independente de também ser
  // gerente de PAP. Uma conta de gerente criada do zero (nunca logou como
  // peregrino) não tem linha em `profiles` e por isso fica false aqui.
  temPerfilPeregrino: boolean;
  nomeCompleto: string | null;
  avatarUrl: string | null;
}

const DEFAULT_STATE: AuthRoleState = {
  loading: true,
  loggedIn: false,
  isAdmin: false,
  isGerente: false,
  temPerfilPeregrino: false,
  nomeCompleto: null,
  avatarUrl: null,
};

const AuthRoleContext = createContext<AuthRoleState>(DEFAULT_STATE);

// Centraliza, num único lugar, a checagem de quem está logado e qual o
// papel da conta (peregrino comum / gerente de PAP / admin) — usada tanto
// pela barra superior (perfil) quanto pelo menu inferior de navegação, para
// não repetir as mesmas consultas ao Supabase duas vezes por página.
export function AuthRoleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthRoleState>(DEFAULT_STATE);

  useEffect(() => {
    const supabase = createClient();

    async function carregar(
      userId: string | undefined,
      metadata: Record<string, unknown> | undefined
    ) {
      if (!userId) {
        setState({ ...DEFAULT_STATE, loading: false, loggedIn: false });
        return;
      }
      const [{ data: perfil }, { data: gerente }] = await Promise.all([
        supabase
          .from("profiles")
          .select("is_admin, nome_completo, avatar_url")
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("gerentes_pap").select("id, nome_completo").eq("id", userId).maybeSingle(),
      ]);
      const isGerente = !!gerente || metadata?.tipo_conta === "gerente_pap";
      setState({
        loading: false,
        loggedIn: true,
        isAdmin: !!perfil?.is_admin,
        isGerente,
        temPerfilPeregrino: !!perfil,
        nomeCompleto:
          (perfil?.nome_completo as string | undefined) ??
          (gerente?.nome_completo as string | undefined) ??
          (metadata?.nome_completo as string | undefined) ??
          null,
        avatarUrl: (perfil?.avatar_url as string | undefined) ?? null,
      });
    }

    supabase.auth.getUser().then(({ data }) => {
      carregar(data.user?.id, data.user?.user_metadata);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      carregar(session?.user?.id, session?.user?.user_metadata);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthRoleContext.Provider value={state}>{children}</AuthRoleContext.Provider>;
}

export function useAuthRole() {
  return useContext(AuthRoleContext);
}
