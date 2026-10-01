"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validarNomeCompleto } from "@/lib/validation";
import { TERMOS_VERSAO_ATUAL } from "@/lib/constants";
import { UserCheck, ArrowLeft } from "lucide-react";
import EscolhaTipoConta from "@/components/EscolhaTipoConta";
import { lerTipoConta, NOME_TIPO_CONTA, type TipoConta } from "@/lib/tipo-conta";

// Rodada 40 — última etapa de quem entrou pela primeira vez com o Google.
// O Google já confirmou o e-mail, então aqui não tem senha nem e-mail de
// confirmação: só o que o cadastro por e-mail também pede — tipo de conta,
// nome, telefone e o aceite dos Termos (obrigatório, mesmo texto de /login).
// No fim faz exatamente o que finalizarCadastro() faz em /login.
function CompletarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoPreset: TipoConta | null = lerTipoConta(searchParams.get("tipo"));

  const [carregandoConta, setCarregandoConta] = useState(true);
  const [emailConta, setEmailConta] = useState("");
  const [tipoConta, setTipoConta] = useState<TipoConta | null>(tipoPreset);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!ativo) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      // Já tem cadastro (ex.: abriu este endereço de novo depois de
      // terminar) — não há nada a completar aqui.
      const [{ data: perfil }, { data: gerente }] = await Promise.all([
        supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
        supabase.from("gerentes_pap").select("id").eq("id", user.id).maybeSingle(),
      ]);
      if (!ativo) return;
      if (perfil || gerente || user.user_metadata?.tipo_conta) {
        router.replace(gerente || user.user_metadata?.tipo_conta === "gerente_pap" ? "/gerente-pap" : "/painel");
        return;
      }
      const meta = user.user_metadata ?? {};
      setEmailConta(user.email ?? "");
      setNome(((meta.full_name ?? meta.name ?? "") as string).trim());
      setCarregandoConta(false);
    })();
    return () => {
      ativo = false;
    };
  }, [router]);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function concluir(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!tipoConta) return;

    const erroNome = validarNomeCompleto(nome);
    if (erroNome) {
      setErro(erroNome);
      return;
    }
    if (!telefone.trim()) {
      setErro("Informe um telefone para contato.");
      return;
    }
    if (!aceitaTermos) {
      setErro("É necessário aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    // Guarda no cadastro da conta os mesmos dados que o cadastro por e-mail
    // guarda no signUp — outras telas (perfil, área do gerente, menu) leem
    // o tipo de conta, nome e telefone daqui.
    const { data: atualizado, error: erroAtualizar } = await supabase.auth.updateUser({
      data: {
        nome_completo: nome.trim(),
        telefone: telefone.trim(),
        tipo_conta: tipoConta,
        aceita_termos: true,
        termos_versao: TERMOS_VERSAO_ATUAL,
      },
    });
    if (erroAtualizar || !atualizado.user) {
      setEnviando(false);
      setErro("Não foi possível salvar agora. Verifique sua internet e tente novamente.");
      return;
    }

    if (tipoConta === "gerente_pap") {
      const { error: erroGerente } = await supabase.from("gerentes_pap").insert({
        id: atualizado.user.id,
        nome_completo: nome.trim(),
        telefone: telefone.trim(),
      });
      if (erroGerente) {
        setEnviando(false);
        setErro("Não foi possível concluir o cadastro de gerente agora. Tente novamente.");
        return;
      }
    }
    // Rodada 59 — todos (inclusive gerente e organizador) ganham o perfil de
    // peregrino: cria a linha mínima com o aceite e segue para completar em /perfil.
    await supabase.rpc("registrar_aceite_termos", { p_nome_completo: nome.trim() });
    router.push(`/perfil?tipo=${tipoConta}`);
    router.refresh();
  }

  if (carregandoConta) {
    return <p className="py-10 text-center text-sm text-neutral-500">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <UserCheck size={22} className="text-amber-700" /> Falta pouco
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Você entrou com o Google como <strong>{emailConta}</strong>{" "}
          <button
            type="button"
            onClick={sair}
            className="text-xs font-medium text-amber-700 underline dark:text-amber-500"
          >
            (não é você? sair)
          </button>
          . {tipoConta ? "Confira seus dados para terminar." : "Como você vai usar o app?"}
        </p>

        {!tipoConta && <EscolhaTipoConta onEscolher={(t) => setTipoConta(t)} />}

        {tipoConta && (
          <form onSubmit={concluir} className="flex flex-col gap-4">
            {!tipoPreset && (
              <button
                type="button"
                onClick={() => {
                  setTipoConta(null);
                  setErro(null);
                }}
                className="flex w-fit items-center gap-1 text-xs font-medium text-neutral-500 hover:text-amber-700"
              >
                <ArrowLeft size={14} /> {NOME_TIPO_CONTA[tipoConta]} — trocar
              </button>
            )}
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
                type="tel"
                autoFocus
                className="input"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
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
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" target="_blank" className="underline">
                  Política de Privacidade
                </Link>
                . Declaro ter 18 anos ou mais.
                {" Autorizo o compartilhamento da minha localização durante o trajeto, do início ao fim de cada peregrinação, para registro dos check-ins, registro do local de sinistros informados, para que a equipe de apoio possa avisar sobre condições adversas na rota e para localização em caso de emergência."}
              </label>
            </div>

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {erro}
              </p>
            )}

            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? "Salvando..." : "Concluir cadastro"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function CompletarCadastroPage() {
  return (
    <Suspense>
      <CompletarForm />
    </Suspense>
  );
}
