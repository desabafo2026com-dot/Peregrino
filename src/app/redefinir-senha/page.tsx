"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound } from "lucide-react";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      setErro(
        error.message.includes("session")
          ? "Este link de recuperação expirou ou já foi usado. Solicite um novo em 'Esqueci minha senha'."
          : error.message
      );
      return;
    }

    setSucesso("Senha redefinida com sucesso! Redirecionando...");
    setTimeout(() => {
      router.push("/perfil");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <KeyRound size={22} className="text-amber-700" /> Criar nova senha
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Você chegou aqui através de um link de recuperação de senha.
          Escolha sua nova senha abaixo.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nova senha</label>
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
            <label className="label">Confirmar nova senha</label>
            <input
              type="password"
              required
              className="input"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
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
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
