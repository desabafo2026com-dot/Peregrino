"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, TriangleAlert, X } from "lucide-react";

// Rodada 24, pedido do usuário: "no perfil criar a opção de excluir
// perfil". Ação irreversível — por isso, em vez de um simples confirm()
// como o já usado para excluir um PAP ou um local de risco, pede para
// digitar "EXCLUIR" antes de liberar o botão, mesmo padrão de fricção
// extra usado por apps quando a ação apaga a conta inteira, não só um
// registro. A exclusão de fato roda no servidor (ver
// /api/perfil/excluir), com a chave de serviço, aproveitando que todo dado
// do usuário no banco já referencia auth.users(id) com "on delete
// cascade" — apagar o usuário já apaga peregrinações, certificados,
// compras, mensagens etc. em cascata.
export default function ExcluirContaForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    try {
      const resp = await fetch("/api/perfil/excluir", { method: "POST" });
      const dados = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setErro(dados.erro ?? "Não foi possível excluir sua conta agora.");
        setExcluindo(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor agora.");
      setExcluindo(false);
    }
  }

  return (
    <div className="card border-red-200 dark:border-red-900">
      <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-red-700 dark:text-red-400">
        <Trash2 size={18} /> Excluir minha conta
      </h3>
      <p className="mb-3 text-sm text-neutral-500">
        Apaga permanentemente sua conta e todos os seus dados (perfil, peregrinações, certificados,
        check-ins, compras da Romaria Plus e mensagens). Se você também for gerente de um PAP, o
        ponto de apoio continua no mapa, só deixa de ter um gerente vinculado. Esta ação não pode
        ser desfeita.
      </p>

      {!aberto ? (
        <button onClick={() => setAberto(true)} className="btn-secondary text-red-700 dark:text-red-400">
          Excluir minha conta
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <p className="flex items-start gap-2 text-sm font-medium text-red-800 dark:text-red-300">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            Para confirmar, digite EXCLUIR no campo abaixo.
          </p>
          <input
            className="input"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="EXCLUIR"
          />
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={excluir}
              disabled={confirmacao.trim().toUpperCase() !== "EXCLUIR" || excluindo}
              className="flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              <Trash2 size={16} /> {excluindo ? "Excluindo..." : "Excluir permanentemente"}
            </button>
            <button
              onClick={() => {
                setAberto(false);
                setConfirmacao("");
                setErro(null);
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
