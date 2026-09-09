"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserPlus } from "lucide-react";

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome_completo: nome, telefone },
      },
    });
    setLoading(false);

    if (error) {
      setErro(
        error.message === "User already registered"
          ? "Este e-mail já está cadastrado. Faça login."
          : error.message
      );
      return;
    }

    if (data.session) {
      // Confirmação de e-mail desabilitada — já entrou.
      router.push("/perfil");
      router.refresh();
      return;
    }

    setSucesso(
      "Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login."
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <UserPlus size={22} className="text-amber-700" /> Criar conta
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Passo 1 de 2: dados de acesso. Depois vamos pedir informações sobre
          sua peregrinação.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nome completo</label>
            <input
              required
              className="input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
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
              placeholder="Repita a senha"
            />
          </div>

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
            {loading ? "Criando conta..." : "Continuar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-amber-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
