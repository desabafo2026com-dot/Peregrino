"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound } from "lucide-react";

export default function AlterarSenhaForm() {
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
      setErro(error.message);
      return;
    }
    setSucesso("Senha alterada com sucesso!");
    setSenha("");
    setConfirmarSenha("");
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
        <KeyRound size={18} /> Alterar senha
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
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
      <button type="submit" disabled={loading} className="btn-secondary w-fit">
        {loading ? "Salvando..." : "Alterar senha"}
      </button>
    </form>
  );
}
