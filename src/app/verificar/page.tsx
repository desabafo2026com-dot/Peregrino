"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VoltarButton from "@/components/VoltarButton";
import { ShieldCheck, Search } from "lucide-react";
import { meioNaFrase, nomeNoCertificado, checkinsNoCertificado, tempoNoCertificado } from "@/lib/certificado-texto";
import type { MeioTransporte } from "@/types/database";

interface Resultado {
  nome_peregrino: string;
  dias_caminhada: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  total_checkins: number;
  emitido_em: string;
  rota_nome: string | null;
  meio_transporte: string | null;
  meio_transporte_outro_desc: string | null;
  duracao_texto: string | null;
  valido: boolean;
}


export default function VerificarPage() {
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<Resultado | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("verificar_certificado", {
      p_codigo: codigo.trim().toUpperCase(),
    });
    setLoading(false);
    setResultado(data && data.length > 0 ? data[0] : null);
  }

  return (
    <div className="mx-auto max-w-md">
      <VoltarButton href="/" />
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <ShieldCheck className="text-amber-700" /> Verificar certificado
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        Digite o código impresso no certificado para confirmar sua autenticidade.
      </p>

      <form onSubmit={verificar} className="mb-6 flex gap-2">
        <input
          className="input"
          placeholder="PGR-XXXXXXXX"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          required
        />
        <button className="btn-primary flex items-center gap-1 whitespace-nowrap" disabled={loading}>
          <Search size={16} /> {loading ? "..." : "Verificar"}
        </button>
      </form>

      {resultado === null && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Código não encontrado.
        </p>
      )}

      {resultado && (
        <div className="card">
          <p className="mb-2 font-semibold text-green-700">✓ Certificado válido</p>
          <p className="text-sm">
            {/* Rodada 58b — mesmo padrão de texto dos certificados. */}
            <strong>{nomeNoCertificado(resultado.nome_peregrino)}</strong> concluiu com êxito a peregrinação{" "}
            {meioNaFrase(resultado.meio_transporte as MeioTransporte | null, resultado.meio_transporte_outro_desc)} até a
            Basílica de Nossa Senhora Aparecida-SP em{" "}
            {tempoNoCertificado(resultado.data_inicio, resultado.data_fim, resultado.duracao_texto) ??
              `${resultado.dias_caminhada} dia(s)`}
            , com {checkinsNoCertificado(resultado.total_checkins)} check-in(s).
          </p>
        </div>
      )}
    </div>
  );
}
