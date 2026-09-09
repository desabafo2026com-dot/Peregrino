"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validarNomeCompleto } from "@/lib/validation";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus } from "lucide-react";

export default function CadastroGerentePapPage() {
  const router = useRouter();
  const [checando, setChecando] = useState(true);
  const [logado, setLogado] = useState(false);

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nomeOrganizacao, setNomeOrganizacao] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setLogado(!!data.user);
      setChecando(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

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
          <MapPinPlus size={22} className="text-amber-700" /> Cadastro de Gerente de PAP
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Este cadastro é separado do cadastro de peregrino. Depois de
          aprovado por um administrador, você poderá entrar no sistema e
          cadastrar seu PAP — que aparecerá para todos os peregrinos.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Enviando..." : "Enviar cadastro"}
          </button>
        </form>

        {!logado && (
          <p className="mt-5 text-center text-sm text-neutral-500">
            Já é gerente de PAP cadastrado?{" "}
            <Link href="/login?redirect=/gerente-pap" className="font-semibold text-amber-700">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
