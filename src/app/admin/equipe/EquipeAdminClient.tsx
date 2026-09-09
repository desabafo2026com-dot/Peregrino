"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createIsolatedClient } from "@/lib/supabase/isolatedClient";
import { validarNomeCompleto } from "@/lib/validation";
import { UserPlus, ShieldCheck, Wrench, Trash2 } from "lucide-react";
import type { Profile } from "@/types/database";

type Papel = "agente" | "admin";

export default function EquipeAdminClient({ equipeInicial }: { equipeInicial: Profile[] }) {
  const supabase = createClient();
  const [equipe, setEquipe] = useState(equipeInicial);

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("agente");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const erroNome = validarNomeCompleto(nomeCompleto);
    if (erroNome) {
      setErro(erroNome);
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    // Cliente isolado: cria a conta sem mexer na sessão do administrador
    // logado neste navegador.
    const isolado = createIsolatedClient();
    const { data, error } = await isolado.auth.signUp({
      email,
      password: senha,
      options: { data: { nome_completo: nomeCompleto } },
    });

    if (error) {
      setLoading(false);
      setErro(
        error.message === "User already registered"
          ? "Este e-mail já está cadastrado."
          : error.message
      );
      return;
    }

    const novoId = data.user?.id;
    if (!novoId) {
      setLoading(false);
      setErro("Não foi possível criar a conta. Tente novamente.");
      return;
    }

    const { data: novoPerfil, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: novoId,
        nome_completo: nomeCompleto,
        is_admin: papel === "admin",
        is_agente: papel === "agente",
      })
      .select()
      .single();

    setLoading(false);
    if (insertError) {
      setErro(insertError.message);
      return;
    }

    setEquipe((prev) => [novoPerfil as Profile, ...prev]);
    setSucesso(
      `Conta de ${papel === "admin" ? "administrador" : "agente"} criada! Avise a pessoa para confirmar o e-mail e fazer login.`
    );
    setNomeCompleto("");
    setEmail("");
    setSenha("");
    setConfirmarSenha("");
  }

  async function alternarPapel(id: string, campo: "is_admin" | "is_agente", valorAtual: boolean) {
    const { error } = await supabase.from("profiles").update({ [campo]: !valorAtual }).eq("id", id);
    if (!error) {
      setEquipe((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: !valorAtual } : p)));
    }
  }

  async function removerDaEquipe(id: string) {
    if (!confirm("Remover esta pessoa da equipe (tira acesso de admin e agente)?")) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: false, is_agente: false })
      .eq("id", id);
    if (!error) {
      setEquipe((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-500">
          <UserPlus size={18} /> Nova conta de agente ou administrador
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome completo</label>
            <input
              required
              className="input"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
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
            />
          </div>
          <div>
            <label className="label">Papel</label>
            <select className="input" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
              <option value="agente">Agente</option>
              <option value="admin">Administrador</option>
            </select>
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
        <button type="submit" disabled={loading} className="btn-primary w-fit">
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>

      <section>
        <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
          Equipe atual
        </h3>
        <div className="flex flex-col gap-2">
          {equipe.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{p.nome_completo}</p>
                <p className="text-xs text-neutral-500">
                  {p.is_admin ? "Administrador" : ""}
                  {p.is_admin && p.is_agente ? " + " : ""}
                  {p.is_agente ? "Agente" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => alternarPapel(p.id, "is_agente", p.is_agente)}
                  className="btn-secondary flex items-center gap-1 text-xs"
                >
                  <Wrench size={14} /> {p.is_agente ? "Remover agente" : "Tornar agente"}
                </button>
                <button
                  onClick={() => alternarPapel(p.id, "is_admin", p.is_admin)}
                  className="btn-secondary flex items-center gap-1 text-xs"
                >
                  <ShieldCheck size={14} /> {p.is_admin ? "Remover admin" : "Tornar admin"}
                </button>
                <button
                  onClick={() => removerDaEquipe(p.id)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={14} /> Remover da equipe
                </button>
              </div>
            </div>
          ))}
          {equipe.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhum agente ou administrador cadastrado ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
