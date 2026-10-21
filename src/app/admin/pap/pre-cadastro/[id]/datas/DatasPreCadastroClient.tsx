"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, CopyPlus } from "lucide-react";
import CalendarioDatas from "@/components/CalendarioDatas";
import type { PapPreCadastro } from "@/types/database";

export default function DatasPreCadastroClient({ item }: { item: PapPreCadastro }) {
  const router = useRouter();
  const [datas, setDatas] = useState<string[]>(item.datas_funcionamento ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Rodada 79 — atalho: repete no ano seguinte os mesmos dias/meses do
  // último ano marcado (ex.: 06 a 10/10/2026 → 06 a 10/10/2027). Só muda o
  // calendário na tela; vale depois de "Salvar datas".
  const anos = [...new Set(datas.map((d) => Number(d.slice(0, 4))))].sort((a, b) => a - b);
  const ultimoAno = anos[anos.length - 1];
  function repetirNoAnoSeguinte() {
    if (!ultimoAno) return;
    const novas = datas
      .filter((d) => d.startsWith(`${ultimoAno}-`))
      .map((d) => `${ultimoAno + 1}${d.slice(4)}`)
      .filter((d) => !(d.endsWith("-02-29")));
    setDatas([...new Set([...datas, ...novas])].sort());
    setOk(false);
  }

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
      {ultimoAno && (
        <button
          type="button"
          onClick={repetirNoAnoSeguinte}
          className="btn-secondary flex w-fit items-center gap-2 text-sm"
        >
          <CopyPlus size={16} /> Repetir em {ultimoAno + 1} os mesmos dias de {ultimoAno}
        </button>
      )}
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
