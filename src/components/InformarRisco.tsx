"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_RISCO } from "@/lib/constants";
import { TriangleAlert, X } from "lucide-react";

interface Props {
  rotaId: string | null;
}

export default function InformarRisco({ rotaId }: Props) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("geral");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function obterPosicao(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!titulo.trim()) {
      setErro("Descreva brevemente o risco no título.");
      return;
    }
    setLoading(true);
    const pos = await obterPosicao();
    if (!pos) {
      setLoading(false);
      setErro("Não foi possível acessar sua localização. Ative o GPS e tente novamente.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("riscos_informados").insert({
      user_id: user.id,
      titulo,
      descricao: descricao || null,
      tipo,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      rota_id: rotaId,
    });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso("Obrigado! Seu relato foi enviado para revisão da administração.");
    setTitulo("");
    setDescricao("");
    setTipo("geral");
    setTimeout(() => {
      setAberto(false);
      setSucesso(null);
    }, 2500);
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
      >
        <TriangleAlert size={16} /> Informar um risco aqui
      </button>
    );
  }

  return (
    <div className="card border-red-200 dark:border-red-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-red-700">
          <TriangleAlert size={18} /> Informar um risco
        </h3>
        <button onClick={() => setAberto(false)} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        Usaremos sua localização atual. A administração revisa o relato
        antes de publicá-lo no mapa.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label">O que está acontecendo?</label>
          <input
            required
            className="input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: cão bravo solto na pista"
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS_RISCO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Detalhes (opcional)</label>
          <textarea
            className="input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {sucesso && <p className="text-sm text-green-700">{sucesso}</p>}
        <button disabled={loading} className="btn-primary">
          {loading ? "Enviando..." : "Enviar relato"}
        </button>
      </form>
    </div>
  );
}
