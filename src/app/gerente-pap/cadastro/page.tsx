"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validarNomeCompleto } from "@/lib/validation";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus } from "lucide-react";
import Link from "next/link";

// Criar uma conta nova de Gerente de PAP agora faz parte do fluxo único de
// entrada por e-mail em /login ("sou gerente de PAP"). Esta página só
// continua existindo para o caso de uma conta **já logada** (ex.: um
// peregrino) que quer também virar gerente de PAP com a mesma conta —
// quem não está logado é enviado direto para o cadastro em /login.
export default function CadastroGerentePapPage() {
  const router = useRouter();
  const [checando, setChecando] = useState(true);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
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
      setChecando(false);
    });
  }, [router]);

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
