"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthRole } from "./AuthRoleProvider";
import { TERMOS_VERSAO_ATUAL } from "@/lib/constants";
import { ScrollText } from "lucide-react";

// Bloqueia o uso do app, com um aviso cheio (não fechável clicando fora),
// para contas que já existiam antes destes Termos de Uso/Política de
// Privacidade (Rodada 19) e por isso nunca os aceitaram, ou que aceitaram
// uma versão antiga que depois foi atualizada. Contas novas já aceitam no
// próprio cadastro (ver /login) e por isso normalmente nunca veem este
// aviso — ele existe principalmente para regularizar a base já cadastrada.
export default function TermosGate() {
  const { precisaAceitarTermos, recarregar } = useAuthRole();
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!precisaAceitarTermos) return null;

  async function confirmar() {
    setErro(null);
    setEnviando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("registrar_aceite_termos", {});
      if (error) {
        setErro("Não foi possível registrar o aceite agora. Tente novamente.");
        setEnviando(false);
        return;
      }
      recarregar();
    } catch {
      setErro("Não foi possível falar com o servidor agora.");
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[85vh] w-full max-w-sm overflow-y-auto text-center">
        <ScrollText className="mx-auto mb-2 text-amber-700 dark:text-amber-500" size={26} />
        <h2 className="mb-1 text-lg font-bold">Atualizamos nossos termos</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Para continuar usando o app, precisamos que você confirme que leu
          e concorda com os Termos de Uso e a Política de Privacidade
          atuais.
        </p>
        <div className="mb-4 flex flex-col gap-1 text-sm">
          <Link href="/termos" target="_blank" className="text-amber-700 underline dark:text-amber-500">
            Ler os Termos de Uso
          </Link>
          <Link
            href="/privacidade"
            target="_blank"
            className="text-amber-700 underline dark:text-amber-500"
          >
            Ler a Política de Privacidade
          </Link>
        </div>
        <label className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-left text-xs text-neutral-600 dark:bg-amber-950/30 dark:text-neutral-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={aceito}
            onChange={(e) => setAceito(e.target.checked)}
          />
          Li e aceito os Termos de Uso e a Política de Privacidade (versão{" "}
          {TERMOS_VERSAO_ATUAL}).
        </label>
        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        <button onClick={confirmar} disabled={!aceito || enviando} className="btn-primary w-full">
          {enviando ? "Enviando..." : "Confirmar e continuar"}
        </button>
      </div>
    </div>
  );
}
