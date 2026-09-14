"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validarNomeCompleto } from "@/lib/validation";
import VoltarButton from "@/components/VoltarButton";
import { LogIn, Mail, KeyRound, Footprints, MapPinPlus, ArrowLeft } from "lucide-react";

type Passo = "email" | "senha" | "tipo" | "cadastro" | "codigo";
type TipoConta = "peregrino" | "gerente_pap";

// Entrada única do app: o peregrino (ou gerente de PAP) digita o e-mail
// primeiro. Se já existe conta, pedimos a senha; se não existe, começa o
// cadastro (nome/telefone/senha) e confirmamos com um código de 6 dígitos
// enviado por e-mail — sem precisar clicar em link, tudo dentro do app.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const avisoConfirmeEmail = searchParams.get("aviso") === "confirme-email";
  const tipoParam = searchParams.get("tipo");
  const tipoPreset: TipoConta | null =
    tipoParam === "peregrino" || tipoParam === "gerente_pap" ? tipoParam : null;

  const [passo, setPasso] = useState<Passo>("email");
  const [tipoConta, setTipoConta] = useState<TipoConta | null>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [codigo, setCodigo] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function voltarParaEmail() {
    setPasso("email");
    setSenha("");
    setErro(null);
    setAviso(null);
  }

  async function handleContinuarEmail(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("email_ja_cadastrado", {
      p_email: email.trim(),
    });
    setLoading(false);
    if (error) {
      setErro("Não foi possível verificar o e-mail agora. Tente novamente em instantes.");
      return;
    }
    if (data) {
      setPasso("senha");
    } else if (tipoPreset) {
      setTipoConta(tipoPreset);
      setPasso("cadastro");
    } else {
      setPasso("tipo");
    }
  }

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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

  async function handleEnviarCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

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
    if (tipoConta === "peregrino" && !aceitaTermos) {
      setErro(
        "É necessário aceitar os termos, incluindo o compartilhamento de localização durante a peregrinação, para se cadastrar."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome_completo: nome,
          telefone,
          tipo_conta: tipoConta,
          aceita_termos: tipoConta === "peregrino" ? true : undefined,
        },
      },
    });
    setLoading(false);

    if (error) {
      setErro(
        error.message === "User already registered"
          ? "Este e-mail já está cadastrado. Volte e entre com sua senha."
          : error.message
      );
      return;
    }

    if (data.session) {
      // Confirmação de e-mail desabilitada no projeto — já entrou direto.
      await finalizarCadastro();
      return;
    }

    setPasso("codigo");
  }

  async function finalizarCadastro() {
    if (tipoConta === "gerente_pap") {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("gerentes_pap").insert({
          id: user.id,
          nome_completo: nome,
          telefone,
        });
      }
      router.push("/gerente-pap");
    } else {
      router.push("/perfil");
    }
    router.refresh();
  }

  async function handleConfirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codigo.trim(),
      type: "signup",
    });
    setLoading(false);
    if (error) {
      setErro(
        error.message.toLowerCase().includes("expired") ||
          error.message.toLowerCase().includes("invalid")
          ? "Código inválido ou expirado. Confira o número ou peça um novo código."
          : error.message
      );
      return;
    }
    setLoading(true);
    await finalizarCadastro();
  }

  async function handleReenviarCodigo() {
    setErro(null);
    setAviso(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setAviso("Enviamos um novo código para o seu e-mail.");
  }

  return (
    <div className="mx-auto max-w-sm">
      <VoltarButton href="/" />
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <LogIn size={22} className="text-amber-700" /> Entrar ou cadastrar
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          {passo === "email" && "Digite seu e-mail para entrar ou criar sua conta."}
          {passo === "senha" && "Este e-mail já tem conta. Informe sua senha."}
          {passo === "tipo" && "Este e-mail ainda não tem conta. Como você vai usar o Peregrino?"}
          {passo === "cadastro" &&
            (tipoConta === "gerente_pap"
              ? "Cadastro de Gerente de PAP — dados de acesso."
              : "Criar conta de peregrino — dados de acesso.")}
          {passo === "codigo" && "Digite o código de 6 dígitos que enviamos para o seu e-mail."}
        </p>

        {avisoConfirmeEmail && passo === "email" && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Confirme seu cadastro para poder entrar.
          </p>
        )}

        {passo === "email" && (
          <form onSubmit={handleContinuarEmail} className="flex flex-col gap-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                required
                autoFocus
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            {erro && <MensagemErro texto={erro} />}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Verificando..." : "Continuar"}
            </button>
          </form>
        )}

        {passo === "senha" && (
          <form onSubmit={handleEntrar} className="flex flex-col gap-4">
            <BotaoVoltarEmail email={email} onVoltar={voltarParaEmail} />
            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                required
                autoFocus
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
            {erro && <MensagemErro texto={erro} />}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}

        {passo === "tipo" && (
          <div className="flex flex-col gap-3">
            <BotaoVoltarEmail email={email} onVoltar={voltarParaEmail} />
            <button
              onClick={() => {
                setTipoConta("peregrino");
                setPasso("cadastro");
                setErro(null);
              }}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-amber-400 dark:border-neutral-800"
            >
              <Footprints className="shrink-0 text-amber-700" size={26} />
              <span>
                <span className="block font-semibold">Sou peregrino</span>
                <span className="block text-xs text-neutral-500">
                  Quero informações de apoio, rotas e emergência.
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setTipoConta("gerente_pap");
                setPasso("cadastro");
                setErro(null);
              }}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-amber-400 dark:border-neutral-800"
            >
              <MapPinPlus className="shrink-0 text-amber-700" size={26} />
              <span>
                <span className="block font-semibold">Sou gerente de PAP</span>
                <span className="block text-xs text-neutral-500">
                  Quero cadastrar ou gerenciar meu Ponto de Apoio ao Peregrino.
                </span>
              </span>
            </button>
          </div>
        )}

        {passo === "cadastro" && (
          <form onSubmit={handleEnviarCadastro} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setPasso(tipoPreset ? "email" : "tipo");
                setErro(null);
              }}
              className="flex w-fit items-center gap-1 text-xs font-medium text-neutral-500 hover:text-amber-700"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
            <div>
              <label className="label">Nome completo</label>
              <input
                required
                autoFocus
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

            {tipoConta === "peregrino" && (
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
            )}

            {erro && <MensagemErro texto={erro} />}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Enviando..." : "Continuar"}
            </button>
          </form>
        )}

        {passo === "codigo" && (
          <form onSubmit={handleConfirmarCodigo} className="flex flex-col gap-4">
            <p className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
              <Mail size={16} className="shrink-0" /> Enviamos um código para{" "}
              <strong>{email}</strong>.
            </p>
            <div>
              <label className="label">Código de verificação</label>
              <input
                required
                autoFocus
                inputMode="numeric"
                maxLength={6}
                className="input text-center text-lg tracking-[0.5em]"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </div>

            {erro && <MensagemErro texto={erro} />}
            {aviso && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                {aviso}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              <KeyRound size={18} className="mr-1 inline" />
              {loading ? "Confirmando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={handleReenviarCodigo}
              disabled={loading}
              className="text-center text-sm font-medium text-amber-700"
            >
              Reenviar código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function BotaoVoltarEmail({ email, onVoltar }: { email: string; onVoltar: () => void }) {
  return (
    <button
      type="button"
      onClick={onVoltar}
      className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-amber-700"
    >
      <ArrowLeft size={14} /> {email} — usar outro e-mail
    </button>
  );
}

function MensagemErro({ texto }: { texto: string }) {
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {texto}
    </p>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
