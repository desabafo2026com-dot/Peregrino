"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import { LogIn } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const aviso = searchParams.get("aviso");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      setLoading(false);
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message
      );
      return;
    }

    // Contas de Gerente de PAP têm sua própria área e nunca devem cair no
    // fluxo de peregrino — verificamos o papel da conta antes de decidir
    // para onde ir, ignorando o parâmetro de redirect quando for o caso.
    let destino = searchParams.get("redirect") || "/perfil";
    if (data.user) {
      const { data: gerente } = await supabase
        .from("gerentes_pap")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      const ehGerente = !!gerente || data.user.user_metadata?.tipo_conta === "gerente_pap";
      if (ehGerente) destino = "/gerente-pap";
    }

    setLoading(false);
    router.push(destino);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm">
      <VoltarButton href="/" />
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <LogIn size={22} className="text-amber-700" /> Entrar
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Acesse sua conta de peregrino.
        </p>

        {aviso === "confirme-email" && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Cadastro realizado! Enviamos um e-mail de confirmação — verifique
            sua caixa de entrada (e o spam) e clique no link antes de entrar.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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

        <p className="mt-5 text-center text-sm text-neutral-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-amber-700">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
