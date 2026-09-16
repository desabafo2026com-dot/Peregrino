"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  TIPO_COMERCIO_OPTIONS,
  SENTIDO_PISTA_OPTIONS,
  CIDADES_DUTRA_SP_QUELUZ,
  BR_OPTIONS,
} from "@/lib/constants";
import { LocateFixed, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PontoComercial, SentidoPista, Br, TipoComercio } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export interface ComercioFormDados {
  tipo: TipoComercio;
  nome: string;
  cidade: string | null;
  br: Br;
  km_referencia: number | null;
  sentido_pista: SentidoPista | null;
  telefone: string | null;
  exibir_telefone: boolean;
  ponto_referencia: string | null;
  descricao: string | null;
  foto_url: string | null;
  latitude: number;
  longitude: number;
}

interface Props {
  comercioInicial?: PontoComercial;
  onSalvar: (dados: ComercioFormDados) => Promise<{ error?: string }>;
  submitLabel: string;
  submitLoadingLabel: string;
}

// Cadastro de Hotéis e Restaurantes (Rodada 21) — feito só pela
// administração, nos mesmos moldes do formulário de PAP (`PapForm`):
// localização exata no mapa, foto, cidade/km/sentido — mas sem calendário,
// serviços ou doações, que são específicos de Ponto de Apoio.
export default function ComercioForm({ comercioInicial, onSalvar, submitLabel, submitLoadingLabel }: Props) {
  const [tipo, setTipo] = useState<string>(comercioInicial?.tipo ?? "hotel");
  const [nome, setNome] = useState(comercioInicial?.nome ?? "");
  const [cidade, setCidade] = useState(comercioInicial?.cidade ?? "");
  const [br, setBr] = useState<string>(comercioInicial?.br ?? "116");
  const [sentidoPista, setSentidoPista] = useState<string>(comercioInicial?.sentido_pista ?? "");
  const [kmReferencia, setKmReferencia] = useState(
    comercioInicial?.km_referencia != null ? String(comercioInicial.km_referencia) : ""
  );
  const [telefone, setTelefone] = useState(comercioInicial?.telefone ?? "");
  const [exibirTelefone, setExibirTelefone] = useState(comercioInicial?.exibir_telefone ?? true);
  const [pontoReferencia, setPontoReferencia] = useState(comercioInicial?.ponto_referencia ?? "");
  const [descricao, setDescricao] = useState(comercioInicial?.descricao ?? "");
  const [fotoUrl, setFotoUrl] = useState(comercioInicial?.foto_url ?? "");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    comercioInicial ? { lat: comercioInicial.latitude, lng: comercioInicial.longitude } : null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErro("A foto deve ter no máximo 4MB.");
      return;
    }
    setEnviandoFoto(true);
    setErro(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEnviandoFoto(false);
      setErro("Sua sessão expirou. Faça login novamente.");
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${comercioInicial?.id ?? "novo"}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("comercios-fotos")
      .upload(path, file, { upsert: true });
    setEnviandoFoto(false);
    if (uploadError) {
      setErro("Não foi possível enviar a foto: " + uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("comercios-fotos").getPublicUrl(path);
    setFotoUrl(data.publicUrl);
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
      setErro("Marque a localização no mapa (ou use sua localização atual).");
      return;
    }
    setLoading(true);
    const { error } = await onSalvar({
      tipo: tipo as TipoComercio,
      nome,
      cidade: cidade || null,
      br: br as Br,
      km_referencia: kmReferencia ? Number(kmReferencia) : null,
      sentido_pista: (sentidoPista || null) as SentidoPista | null,
      telefone: telefone || null,
      exibir_telefone: exibirTelefone,
      ponto_referencia: pontoReferencia || null,
      descricao: descricao || null,
      foto_url: fotoUrl || null,
      latitude: coords.lat,
      longitude: coords.lng,
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
        <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">Dados do estabelecimento</h3>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-amber-200 bg-neutral-100 dark:border-amber-900 dark:bg-neutral-800">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="Foto do estabelecimento" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-neutral-400">
                Sem foto
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviandoFoto}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload size={16} /> {enviandoFoto ? "Enviando..." : "Enviar foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadFoto}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPO_COMERCIO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nome</label>
            <input required className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
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
            <label className="label">Cidade</label>
            <select className="input" value={cidade} onChange={(e) => setCidade(e.target.value)}>
              <option value="">Não informada</option>
              {comercioInicial?.cidade && !CIDADES_DUTRA_SP_QUELUZ.includes(comercioInicial.cidade) && (
                <option value={comercioInicial.cidade}>{comercioInicial.cidade} (cadastro anterior)</option>
              )}
              {CIDADES_DUTRA_SP_QUELUZ.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
            <label className="label">Telefone de contato</label>
            <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Ponto de referência (opcional)</label>
            <input
              className="input"
              placeholder="Ex: em frente ao posto Shell, ao lado da igreja..."
              value={pontoReferencia}
              onChange={(e) => setPontoReferencia(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição (opcional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Ex: café da manhã incluso, estacionamento, aceita pet, cardápio executivo..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={exibirTelefone}
              onChange={(e) => setExibirTelefone(e.target.checked)}
            />
            Exibir o telefone de contato publicamente no mapa
          </label>
        </div>
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
