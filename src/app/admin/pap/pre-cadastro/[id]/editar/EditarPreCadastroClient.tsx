"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BR_OPTIONS, CIDADES_DUTRA_SP_QUELUZ, SENTIDO_PISTA_OPTIONS } from "@/lib/constants";
import type { PapPreCadastro } from "@/types/database";

export default function EditarPreCadastroClient({ item }: { item: PapPreCadastro }) {
  const router = useRouter();
  const [nome, setNome] = useState(item.nome);
  const [cidade, setCidade] = useState(item.cidade ?? "");
  const [br, setBr] = useState<string>(item.br ?? "116");
  const [km, setKm] = useState(item.km != null ? String(item.km) : "");
  const [sentido, setSentido] = useState<string>(item.sentido_pista ?? "");
  const [textoDatas, setTextoDatas] = useState(item.data_funcionamento_texto ?? "");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvar() {
    setAviso(null);
    if (!nome.trim()) {
      setAviso({ ok: false, texto: "O nome do PAP não pode ficar em branco." });
      return;
    }
    const kmNumero = km.trim() ? Number(km.replace(",", ".")) : null;
    if (kmNumero != null && (Number.isNaN(kmNumero) || kmNumero < 0 || kmNumero > 500)) {
      setAviso({ ok: false, texto: "Km inválido (use só números, ex.: 150 ou 150,5)." });
      return;
    }
    setSalvando(true);
    const { error } = await createClient()
      .from("paps_pre_cadastro")
      .update({
        nome: nome.trim(),
        cidade: cidade.trim() || null,
        br,
        km: kmNumero,
        sentido_pista: sentido || null,
        data_funcionamento_texto: textoDatas.trim() || null,
      })
      .eq("id", item.id);
    setSalvando(false);
    if (error) {
      setAviso({ ok: false, texto: `Não foi possível salvar: ${error.message}` });
      return;
    }
    setAviso({ ok: true, texto: "Salvo!" });
    router.refresh();
  }

  return (
    <div className="card flex flex-col gap-4">
      {item.reivindicado_por && (
        <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" style={{ textAlign: "left" }}>
          Este PAP já tem gerente vinculado: os dados que aparecem no app são os do cadastro do gerente. A mudança
          aqui só vale para a base de pré-cadastro.
        </p>
      )}
      <div>
        <label className="label">Nome do PAP</label>
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="label">Cidade</label>
        <input className="input" list="cidades-dutra" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        <datalist id="cidades-dutra">
          {CIDADES_DUTRA_SP_QUELUZ.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Rodovia</label>
          <select className="input" value={br} onChange={(e) => setBr(e.target.value)}>
            {BR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Km</label>
          <input className="input" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ex.: 150,5" />
        </div>
        <div>
          <label className="label">Sentido da pista</label>
          <select className="input" value={sentido} onChange={(e) => setSentido(e.target.value)}>
            <option value="">Sem informação</option>
            {SENTIDO_PISTA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Texto das datas (como aparece na lista)</label>
        <input
          className="input"
          value={textoDatas}
          onChange={(e) => setTextoDatas(e.target.value)}
          placeholder="Ex.: 06 a 10 de outubro"
        />
        <p className="mt-1 text-xs text-neutral-500" style={{ textAlign: "left" }}>
          Os dias em que o PAP aparece como ativo são marcados no calendário (botão &quot;Datas&quot; na lista).
        </p>
      </div>
      {aviso && <p className={`text-sm ${aviso.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{aviso.texto}</p>}
      <button type="button" onClick={salvar} disabled={salvando} className="btn-primary flex w-fit items-center gap-2">
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar alterações
      </button>
    </div>
  );
}
