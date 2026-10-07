"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Rodada 61 — libera a arte grátis (uma por conta) e abre o editor dela.
export default function BotaoArteGratis({
  certificadoId,
  className,
  children,
}: {
  certificadoId: string;
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function liberar() {
    setErro(null);
    setOcupado(true);
    const { error } = await createClient().rpc("liberar_arte_gratis_romaria_plus", {
      p_certificado_id: certificadoId,
    });
    if (error) {
      setOcupado(false);
      setErro(
        error.message.includes("arte_gratis_ja_usada")
          ? "Sua arte grátis já foi usada em outra peregrinação."
          : error.message.includes("ja_tem_plus")
            ? "Esta peregrinação já tem a Romaria Plus."
            : "Não foi possível liberar agora. Tente novamente."
      );
      return;
    }
    router.push(`/certificado/plus/${certificadoId}`);
  }

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <button
        type="button"
        onClick={liberar}
        disabled={ocupado}
        className={
          className ??
          "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-500 bg-amber-50 px-4 py-3 font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-950/40 dark:text-amber-300"
        }
      >
        <Gift size={20} />
        {ocupado ? "Abrindo..." : (children ?? "Criar minha primeira arte grátis")}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
