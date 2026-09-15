"use client";

import { useState } from "react";
import { Ticket, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CupomRomariaPlus } from "@/types/database";

// Caracteres sem ambiguidade visual (sem 0/O, 1/I/L) — mais fácil de digitar
// certo a partir de um cupom impresso ou lido em voz alta.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function gerarCodigo() {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    if (i === 3) s += "-";
  }
  return s;
}

export default function CuponsRomariaPlusClient({
  cuponsIniciais,
}: {
  cuponsIniciais: CupomRomariaPlus[];
}) {
  const [cupons, setCupons] = useState(cuponsIniciais);
  const [quantidade, setQuantidade] = useState(10);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  async function gerar() {
    if (quantidade < 1 || quantidade > 200) {
      setErro("Escolha uma quantidade entre 1 e 200.");
      return;
    }
    setErro(null);
    setGerando(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErro("Sessão expirada — atualize a página e tente de novo.");
        setGerando(false);
        return;
      }

      // Chance de colisão de código é virtualmente nula (32^8 combinações),
      // mas tenta de novo o lote inteiro se, ainda assim, acontecer.
      let tentativa = 0;
      let inseridos: CupomRomariaPlus[] | null = null;
      while (tentativa < 3 && !inseridos) {
        const codigos = Array.from({ length: quantidade }, gerarCodigo);
        const linhas = codigos.map((codigo) => ({ codigo, criado_por: user.id }));
        const { data, error } = await supabase
          .from("cupons_romaria_plus")
          .insert(linhas)
          .select();
        if (!error) {
          inseridos = data as CupomRomariaPlus[];
        }
        tentativa++;
      }

      if (!inseridos) {
        setErro("Não foi possível gerar os cupons agora. Tente novamente.");
        setGerando(false);
        return;
      }

      setCupons((prev) => [...inseridos!, ...prev]);
    } catch {
      setErro("Não foi possível falar com o servidor agora.");
    } finally {
      setGerando(false);
    }
  }

  function copiar(cupom: CupomRomariaPlus) {
    navigator.clipboard?.writeText(cupom.codigo).then(() => {
      setCopiadoId(cupom.id);
      setTimeout(() => setCopiadoId((v) => (v === cupom.id ? null : v)), 1500);
    });
  }

  const disponiveis = cupons.filter((c) => !c.usado_por);
  const usados = cupons.filter((c) => c.usado_por);

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="qtd-cupons" className="text-xs font-medium text-neutral-500">
            Quantidade de cupons
          </label>
          <input
            id="qtd-cupons"
            type="number"
            min={1}
            max={200}
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            className="w-28 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button onClick={gerar} disabled={gerando} className="btn-primary flex items-center gap-2">
          <Ticket size={16} /> {gerando ? "Gerando..." : "Gerar cupons"}
        </button>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-amber-800 dark:text-amber-500">
          Disponíveis ({disponiveis.length})
        </h3>
        {disponiveis.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum cupom disponível — gere alguns acima.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {disponiveis.map((c) => (
              <button
                key={c.id}
                onClick={() => copiar(c)}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm hover:border-amber-300 dark:border-neutral-800"
                title="Copiar código"
              >
                {c.codigo}
                {copiadoId === c.id ? (
                  <Check size={14} className="text-green-600" />
                ) : (
                  <Copy size={14} className="text-neutral-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {usados.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-neutral-500">Já usados ({usados.length})</h3>
          <div className="flex flex-col gap-1 text-sm text-neutral-400">
            {usados.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border-b border-dashed border-neutral-200 py-1 dark:border-neutral-800">
                <span className="font-mono line-through">{c.codigo}</span>
                <span>
                  usado em {c.usado_em ? new Date(c.usado_em).toLocaleDateString("pt-BR") : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
