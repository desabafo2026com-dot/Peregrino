"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { TERMOS_VERSAO_ATUAL } from "@/lib/constants";

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
  // true quando a conta já tem pelo menos um cadastro (profiles e/ou
  // gerentes_pap) mas nenhum deles registra ter aceito a versão atual dos
  // Termos/Política — usado pelo TermosGate (Rodada 19) para bloquear o
  // app com um aviso até a pessoa aceitar. Fica false enquanto a conta
  // ainda não tem nenhum cadastro (ex.: entre o signUp e finalizarCadastro),
  // que é um estado transitório, não um caso real de "nunca aceitou".
  precisaAceitarTermos: boolean;
}

const DEFAULT_STATE: AuthRoleState = {
  loading: true,
  loggedIn: false,
  isAdmin: false,
  isGerente: false,
  temPerfilPeregrino: false,
  nomeCompleto: null,
  avatarUrl: null,
  precisaAceitarTermos: false,
};

const AuthRoleContext = createContext<AuthRoleState & { recarregar: () => void }>({
  ...DEFAULT_STATE,
  recarregar: () => {},
});

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
          .select("is_admin, nome_completo, avatar_url, termos_aceitos_versao")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("gerentes_pap")
          .select("id, nome_completo, termos_aceitos_versao")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      const isGerente = !!gerente || metadata?.tipo_conta === "gerente_pap";
      // Só considera "precisa aceitar" quando já existe pelo menos um
      // cadastro (senão é o instante transitório entre o signUp e a
      // criação do perfil/gerente, tratado separadamente no próprio
      // fluxo de cadastro) e algum dos dois cadastros existentes está com
      // a versão desatualizada (ou nunca aceitou).
      const versaoPerfilOk = !perfil || perfil.termos_aceitos_versao === TERMOS_VERSAO_ATUAL;
      const versaoGerenteOk = !gerente || gerente.termos_aceitos_versao === TERMOS_VERSAO_ATUAL;
      const temAlgumCadastro = !!perfil || !!gerente;
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
        precisaAceitarTermos: temAlgumCadastro && (!versaoPerfilOk || !versaoGerenteOk),
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

  // Usado depois de aceitar os termos no TermosGate: o jeito mais simples e
  // confiável de refletir o novo estado em toda a árvore (topo, menu
  // inferior, gate) é recarregar a página — recriar a lógica de "carregar"
  // fora do efeito só para evitar um reload não vale a complexidade extra
  // aqui, já que isso acontece raramente (uma vez por versão dos termos).
  function recarregar() {
    window.location.reload();
  }

  return (
    <AuthRoleContext.Provider value={{ ...state, recarregar }}>{children}</AuthRoleContext.Provider>
  );
}

export function useAuthRole() {
  return useContext(AuthRoleContext);
}
