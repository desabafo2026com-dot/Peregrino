"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validarNomeCompleto } from "@/lib/validation";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus, LogIn, UserPlus } from "lucide-react";

type Aba = "entrar" | "cadastrar";

export default function CadastroGerentePapPage() {
  const router = useRouter();
  const [checando, setChecando] = useState(true);
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState<Aba>("cadastrar");

  // Aba "Entrar"
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");

  // Aba "Cadastrar"
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nomeOrganizacao, setNomeOrganizacao] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setLogado(!!data.user);
      setChecando(false);
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: senhaLogin,
    });
    setLoading(false);
    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message
      );
      return;
    }
    router.push("/gerente-pap");
    router.refresh();
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const erroNome = validarNomeCompleto(nomeCompleto);
    if (erroNome) {
      setErro(erroNome);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    let userId: string | undefined;

    if (logado) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
    } else {
      if (senha !== confirmarSenha) {
        setLoading(false);
        setErro("As senhas não coincidem.");
        return;
      }
      if (senha.length < 6) {
        setLoading(false);
        setErro("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome_completo: nomeCompleto,
            telefone,
            nome_organizacao: nomeOrganizacao || null,
            tipo_conta: "gerente_pap",
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (error) {
        setLoading(false);
        setErro(
          error.message === "User already registered"
            ? "Este e-mail já está cadastrado. Faça login e volte a esta página."
            : error.message
        );
        return;
      }

      if (!data.session) {
        // Confirmação de e-mail exigida: só criamos o registro de gerente
        // quando ela confirmar e entrar (ver /gerente-pap). O status do
        // gerente já nasce aprovado — não há aprovação prévia da conta,
        // só da divulgação do PAP que ela cadastrar depois.
        setLoading(false);
        setSucesso(
          "Cadastro realizado! Verifique seu e-mail para confirmar a conta. Redirecionando..."
        );
        setTimeout(() => router.push("/login?aviso=confirme-email"), 2000);
        return;
      }
      userId = data.user?.id;
    }

    if (!userId) {
      setLoading(false);
      setErro("Não foi possível identificar sua conta. Tente novamente.");
      return;
    }

    const { error: insertError } = await supabase.from("gerentes_pap").insert({
      id: userId,
      nome_completo: nomeCompleto,
      telefone,
      nome_organizacao: nomeOrganizacao || null,
    });

    setLoading(false);
    if (insertError) {
      setErro(insertError.message);
      return;
    }

    router.push("/gerente-pap");
    router.refresh();
  }

  if (checando) {
    return <p className="text-sm text-neutral-400">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-sm">
      <VoltarButton href="/mapa" />
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <MapPinPlus size={22} className="text-amber-700" /> Cadastrar PAP
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Este acesso é separado do cadastro de peregrino. Cadastre-se, entre
          e você já pode cadastrar seu PAP — ele fica visível no mapa para
          todos os peregrinos assim que um administrador aprovar a
          divulgação.
        </p>

        {!logado && (
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setAba("cadastrar")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold ${
                aba === "cadastrar"
                  ? "bg-amber-800 text-white"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              <UserPlus size={16} /> Cadastrar
            </button>
            <button
              onClick={() => setAba("entrar")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold ${
                aba === "entrar"
                  ? "bg-amber-800 text-white"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              <LogIn size={16} /> Entrar
            </button>
          </div>
        )}

        {(logado || aba === "cadastrar") && (
          <form onSubmit={handleCadastro} className="flex flex-col gap-4">
            <div>
              <label className="label">Nome completo</label>
              <input
                required
                className="input"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Nome e sobrenome"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                required
                className="input"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="label">Nome do PAP / organização (opcional)</label>
              <input
                className="input"
                value={nomeOrganizacao}
                onChange={(e) => setNomeOrganizacao(e.target.value)}
              />
            </div>

            {!logado && (
              <>
                <div>
                  <label className="label">E-mail</label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                  />
                </div>
                <div>
                  <label className="label">Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="input"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="label">Confirmar senha</label>
                  <input
                    type="password"
                    required
                    className="input"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </div>
              </>
            )}

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {erro}
              </p>
            )}
            {sucesso && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                {sucesso}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Enviando..." : "Enviar cadastro"}
            </button>
          </form>
        )}

        {!logado && aba === "entrar" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                required
                className="input"
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                required
                className="input"
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
                placeholder="••••••••"
              />
              <p className="mt-1 text-right">
                <Link href="/recuperar-senha" className="text-xs font-medium text-amber-700">
                  Esqueci minha senha
                </Link>
              </p>
            </div>

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {erro}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
