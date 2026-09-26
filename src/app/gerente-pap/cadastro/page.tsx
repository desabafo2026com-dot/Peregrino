"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validarNomeCompleto } from "@/lib/validation";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus, UserRoundCheck } from "lucide-react";
import Link from "next/link";

// Criar uma conta nova de Gerente de PAP agora faz parte do fluxo único de
// entrada por e-mail em /login ("sou gerente de PAP"). Esta página só
// continua existindo para o caso de uma conta **já logada** (ex.: um
// peregrino) que quer também virar gerente de PAP com a mesma conta —
// quem não está logado é enviado direto para o cadastro em /login.
//
// Rodada 34 — a pedido do usuário: quem já tem um cadastro de peregrino
// (profiles, com nome_completo e telefone) não precisa digitar esses dados
// de novo só para virar gerente de PAP também. `gerentes_pap` continua
// sendo uma tabela própria (nome_completo/telefone não são FK de profiles —
// existem contas de gerente sem nenhum profile de peregrino, ver
// gerentesSemPerfilPeregrino em admin/page.tsx), mas quando o profile já
// tem os dois dados, mostra uma tela simples de confirmar/cancelar em vez
// do formulário completo.
export default function CadastroGerentePapPage() {
  const router = useRouter();
  const [checando, setChecando] = useState(true);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [perfilCompleto, setPerfilCompleto] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        router.replace("/login?tipo=gerente_pap");
        return;
      }
      const { data: gerente } = await supabase
        .from("gerentes_pap")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (gerente) {
        router.replace("/gerente-pap");
        return;
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome_completo, telefone")
        .eq("id", user.id)
        .maybeSingle();

      if (perfil?.nome_completo && perfil?.telefone) {
        // Já tem os dois dados no cadastro de peregrino — usa a tela de
        // confirmar/cancelar em vez do formulário.
        setNomeCompleto(perfil.nome_completo);
        setTelefone(perfil.telefone);
        setPerfilCompleto(true);
      } else if (perfil?.nome_completo) {
        // Tem só o nome — pré-preenche para poupar digitação, mas ainda
        // pede o telefone no formulário completo.
        setNomeCompleto(perfil.nome_completo);
      }
      setChecando(false);
    });
  }, [router]);

  async function confirmarComDadosDoPerfil() {
    setErro(null);
    if (!aceitaTermos) {
      setErro("É necessário aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }

    const { error: insertError } = await supabase.from("gerentes_pap").insert({
      id: user.id,
      nome_completo: nomeCompleto,
      telefone,
    });

    if (insertError) {
      setLoading(false);
      setErro(insertError.message);
      return;
    }

    await supabase.rpc("registrar_aceite_termos", {});
    setLoading(false);
    router.push("/gerente-pap");
    router.refresh();
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const erroNome = validarNomeCompleto(nomeCompleto);
    if (erroNome) {
      setErro(erroNome);
      return;
    }
    if (!aceitaTermos) {
      setErro("É necessário aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }

    const { error: insertError } = await supabase.from("gerentes_pap").insert({
      id: user.id,
      nome_completo: nomeCompleto,
      telefone,
    });

    if (insertError) {
      setLoading(false);
      setErro(insertError.message);
      return;
    }

    // O aceite (checkbox obrigatório acima) já foi dado — registra a
    // versão/data no servidor agora que a linha em gerentes_pap existe.
    await supabase.rpc("registrar_aceite_termos", {});
    setLoading(false);

    router.push("/gerente-pap");
    router.refresh();
  }

  if (checando) {
    return <p className="text-sm text-neutral-400">Carregando...</p>;
  }

  if (perfilCompleto) {
    return (
      <div className="mx-auto max-w-sm">
        <VoltarButton href="/mapa" />
        <div className="card">
          <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
            <UserRoundCheck size={22} className="text-amber-700" /> Também virar Gerente de PAP
          </h1>
          <p className="mb-5 text-sm text-neutral-500">
            Você já está logado e já tem estes dados no seu cadastro de
            peregrino — confirme para também poder cadastrar um Ponto de
            Apoio ao Peregrino com esta mesma conta.
          </p>

          <div className="mb-4 flex flex-col gap-1 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
            <p>
              <span className="text-neutral-500">Nome completo:</span>{" "}
              <span className="font-medium">{nomeCompleto}</span>
            </p>
            <p>
              <span className="text-neutral-500">Telefone:</span>{" "}
              <span className="font-medium">{telefone}</span>
            </p>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
            <input
              id="termos-gerente"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4"
              checked={aceitaTermos}
              onChange={(e) => setAceitaTermos(e.target.checked)}
            />
            <label htmlFor="termos-gerente" className="text-xs text-neutral-600 dark:text-neutral-300">
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de Privacidade
              </Link>{" "}
              também para esta conta de Gerente de PAP.
            </label>
          </div>

          {erro && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {erro}
            </p>
          )}

          <div className="flex gap-2">
            <Link href="/mapa" className="btn-secondary flex-1 text-center">
              Cancelar
            </Link>
            <button
              onClick={confirmarComDadosDoPerfil}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <VoltarButton href="/mapa" />
      <div className="card">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <MapPinPlus size={22} className="text-amber-700" /> Também virar Gerente de PAP
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Você já está logado — complete os dados abaixo para também poder
          cadastrar um Ponto de Apoio ao Peregrino com esta mesma conta.
        </p>

        <form onSubmit={handleCadastro} className="flex flex-col gap-4">
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

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
            <input
              id="termos-gerente"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4"
              checked={aceitaTermos}
              onChange={(e) => setAceitaTermos(e.target.checked)}
            />
            <label htmlFor="termos-gerente" className="text-xs text-neutral-600 dark:text-neutral-300">
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de Privacidade
              </Link>{" "}
              também para esta conta de Gerente de PAP.
            </label>
          </div>

          {erro && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {erro}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Enviando..." : "Enviar cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
