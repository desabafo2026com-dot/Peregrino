"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import { KeyRound } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(
      "Se este e-mail estiver cadastrado, você vai receber um link para redefinir sua senha em instantes."
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <VoltarButton href="/login" />
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <KeyRound size={22} className="text-amber-700" /> Recuperar senha
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Informe seu e-mail de cadastro. Enviaremos um link para você criar
          uma nova senha.
        </p>

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
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-semibold text-amber-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
