"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserPlus } from "lucide-react";
import { validarNomeCompleto } from "@/lib/validation";
import VoltarButton from "@/components/VoltarButton";

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const erroNome = validarNomeCompleto(nome);
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
    if (!aceitaTermos) {
      setErro(
        "É necessário aceitar os termos, incluindo o compartilhamento de localização durante a peregrinação, para se cadastrar."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome_completo: nome, telefone, aceita_termos: true },
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
      <VoltarButton href="/" />
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
              placeholder="Nome e sobrenome"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Informe nome e sobrenome, como em seu documento.
            </p>
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

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
            <input
              id="termos"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4"
              checked={aceitaTermos}
              onChange={(e) => setAceitaTermos(e.target.checked)}
            />
            <label htmlFor="termos" className="text-xs text-neutral-600 dark:text-neutral-300">
              Li e aceito os Termos de Uso. Ao aceitar, autorizo o
              compartilhamento da minha localização durante o trajeto, do
              início ao fim de cada peregrinação, exclusivamente para que a
              equipe de apoio possa avisar sobre condições adversas e me
              localizar em caso de emergência — outros peregrinos não veem
              minha localização.
            </label>
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
