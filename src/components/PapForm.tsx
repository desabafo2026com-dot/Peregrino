"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { SERVICOS_PONTO_APOIO, SENTIDO_PISTA_OPTIONS } from "@/lib/constants";
import { LocateFixed } from "lucide-react";
import type { PontoApoio, Rota, SentidoPista } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export interface PapFormDados {
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  exibir_telefone: boolean;
  latitude: number;
  longitude: number;
  km_referencia: number | null;
  cidade: string | null;
  sentido_pista: SentidoPista | null;
  rota_id: string | null;
  periodo_funcionamento: string | null;
  servicos: string[];
  aceita_doacoes: boolean;
  doacao_necessidade: string | null;
  contato_doacao: string | null;
  observacoes: string | null;
}

interface Props {
  pontoInicial?: PontoApoio;
  onSalvar: (dados: PapFormDados) => Promise<{ error?: string }>;
  submitLabel: string;
  submitLoadingLabel: string;
}

export default function PapForm({ pontoInicial, onSalvar, submitLabel, submitLoadingLabel }: Props) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaId, setRotaId] = useState<string>(pontoInicial?.rota_id ?? "");
  const [nome, setNome] = useState(pontoInicial?.nome ?? "");
  const [cidade, setCidade] = useState(pontoInicial?.cidade ?? "");
  const [sentidoPista, setSentidoPista] = useState<string>(pontoInicial?.sentido_pista ?? "");
  const [responsavel, setResponsavel] = useState(pontoInicial?.responsavel ?? "");
  const [telefone, setTelefone] = useState(pontoInicial?.telefone ?? "");
  const [exibirTelefone, setExibirTelefone] = useState(pontoInicial?.exibir_telefone ?? true);
  const [kmReferencia, setKmReferencia] = useState(
    pontoInicial?.km_referencia != null ? String(pontoInicial.km_referencia) : ""
  );
  const [periodo, setPeriodo] = useState(pontoInicial?.periodo_funcionamento ?? "");
  const [servicos, setServicos] = useState<string[]>(pontoInicial?.servicos ?? []);
  const [aceitaDoacoes, setAceitaDoacoes] = useState(pontoInicial?.aceita_doacoes ?? false);
  const [doacaoNecessidade, setDoacaoNecessidade] = useState(pontoInicial?.doacao_necessidade ?? "");
  const [contatoDoacao, setContatoDoacao] = useState(pontoInicial?.contato_doacao ?? "");
  const [observacoes, setObservacoes] = useState(pontoInicial?.observacoes ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    pontoInicial ? { lat: pontoInicial.latitude, lng: pontoInicial.longitude } : null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rotas")
      .select("*")
      .order("ordem")
      .then(({ data }) => setRotas((data ?? []) as Rota[]));
  }, []);

  function toggleServico(v: string) {
    setServicos((prev) => (prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]));
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErro("Geolocalização não disponível neste navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErro("Não foi possível obter sua localização. Marque no mapa.")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!coords) {
      setErro("Marque a localização do PAP no mapa (ou use sua localização atual).");
      return;
    }
    setLoading(true);
    const { error } = await onSalvar({
      nome,
      responsavel: responsavel || null,
      telefone: telefone || null,
      exibir_telefone: exibirTelefone,
      latitude: coords.lat,
      longitude: coords.lng,
      km_referencia: kmReferencia ? Number(kmReferencia) : null,
      cidade: cidade || null,
      sentido_pista: (sentidoPista || null) as SentidoPista | null,
      rota_id: rotaId || null,
      periodo_funcionamento: periodo || null,
      servicos,
      aceita_doacoes: aceitaDoacoes,
      doacao_necessidade: aceitaDoacoes ? doacaoNecessidade || null : null,
      contato_doacao: contatoDoacao || null,
      observacoes: observacoes || null,
    });
    setLoading(false);
    if (error) setErro(error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="card">
        <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">Localização</h3>
        <button
          type="button"
          onClick={usarLocalizacaoAtual}
          className="btn-secondary mb-3 flex items-center gap-2"
        >
          <LocateFixed size={18} /> Usar minha localização atual
        </button>
        <p className="mb-2 text-xs text-neutral-500">Ou toque no mapa para marcar o ponto exato.</p>
        <MapView
          pickMode
          onPick={(lat, lng) => setCoords({ lat, lng })}
          markerPreview={coords ? { lat: coords.lat, lng: coords.lng } : null}
          center={coords ? [coords.lng, coords.lat] : undefined}
          height="350px"
          zoom={10}
        />
        {coords && (
          <p className="mt-2 text-xs text-neutral-500">
            Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        )}
      </div>

      <div className="card">
        <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">Dados do PAP</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome do local</label>
            <input required className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input required className="input" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <label className="label">Pista — sentido</label>
            <select className="input" value={sentidoPista} onChange={(e) => setSentidoPista(e.target.value)}>
              <option value="">Não informado</option>
              {SENTIDO_PISTA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Responsável</label>
            <input className="input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div>
            <label className="label">Telefone de contato</label>
            <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div>
            <label className="label">Km de referência na rodovia</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={kmReferencia}
              onChange={(e) => setKmReferencia(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Rota</label>
            <select className="input" value={rotaId} onChange={(e) => setRotaId(e.target.value)}>
              <option value="">Ambas as rotas</option>
              {rotas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} ({r.origem} → {r.destino})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Período de funcionamento</label>
            <input
              className="input"
              placeholder="Ex: todos os dias, 6h-22h"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={exibirTelefone}
              onChange={(e) => setExibirTelefone(e.target.checked)}
            />
            Autorizo exibir o telefone de contato publicamente no mapa
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">Serviços oferecidos</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SERVICOS_PONTO_APOIO.map((s) => (
            <label key={s.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={servicos.includes(s.value)}
                onChange={() => toggleServico(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">Doações</h3>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={aceitaDoacoes}
            onChange={(e) => setAceitaDoacoes(e.target.checked)}
          />
          Este PAP aceita doações
        </label>
        {aceitaDoacoes && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Do que precisa</label>
              <input
                className="input"
                placeholder="Ex: água, alimentos não perecíveis, cobertores..."
                value={doacaoNecessidade}
                onChange={(e) => setDoacaoNecessidade(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Contato para doações</label>
              <input
                className="input"
                placeholder="Pix, telefone, etc."
                value={contatoDoacao}
                onChange={(e) => setContatoDoacao(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <label className="label">Observações</label>
        <textarea
          className="input"
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? submitLoadingLabel : submitLabel}
      </button>
    </form>
  );
}
