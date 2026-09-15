"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2 } from "lucide-react";
import CalendarioDatas from "@/components/CalendarioDatas";
import type { PapPreCadastro } from "@/types/database";

export default function DatasPreCadastroClient({ item }: { item: PapPreCadastro }) {
  const router = useRouter();
  const [datas, setDatas] = useState<string[]>(item.datas_funcionamento ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setOk(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("paps_pre_cadastro")
      .update({ datas_funcionamento: datas })
      .eq("id", item.id);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <CalendarioDatas value={datas} onChange={setDatas} />
      </div>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}
      {ok && (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 size={16} /> Datas salvas com sucesso.
        </p>
      )}
      <button onClick={salvar} disabled={salvando} className="btn-primary">
        {salvando ? "Salvando..." : "Salvar datas"}
      </button>
    </div>
  );
}
