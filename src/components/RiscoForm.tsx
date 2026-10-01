"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { NIVEL_RISCO_LABELS, SENTIDO_PISTA_OPTIONS, BR_OPTIONS, ROTA_FAIXA_KM, nomeRota, kmPertenceARota } from "@/lib/constants";
import { LocateFixed, Upload } from "lucide-react";
import type { PontoRisco, Rota, Br } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

const TIPOS = [
  { value: "geral", label: "Geral" },
  { value: "transito", label: "Trânsito / atropelamento" },
  { value: "assalto", label: "Assalto / segurança" },
  { value: "sem_acostamento", label: "Sem acostamento / marginal" },
  { value: "animal", label: "Animais na pista" },
  { value: "iluminacao", label: "Falta de iluminação" },
];

export interface RiscoFormDados {
  titulo: string;
  descricao: string | null;
  latitude: number;
  longitude: number;
  br: Br;
  km_referencia: number | null;
  sentido: string | null;
  ponto_referencia: string | null;
  tipo: string;
  nivel_risco: number;
  rota_id: string | null;
  foto_url: string | null;
}

interface Props {
  riscoInicial?: PontoRisco;
  onSalvar: (dados: RiscoFormDados) => Promise<{ error?: string }>;
  submitLabel: string;
  submitLoadingLabel: string;
}

export default function RiscoForm({ riscoInicial, onSalvar, submitLabel, submitLoadingLabel }: Props) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaId, setRotaId] = useState<string>(riscoInicial?.rota_id ?? "");
  const [titulo, setTitulo] = useState(riscoInicial?.titulo ?? "");
  const [descricao, setDescricao] = useState(riscoInicial?.descricao ?? "");
  const [tipo, setTipo] = useState(riscoInicial?.tipo ?? "geral");
  const [nivelRisco, setNivelRisco] = useState(String(riscoInicial?.nivel_risco ?? 3));
  const [br, setBr] = useState<string>(riscoInicial?.br ?? "116");
  const [kmReferencia, setKmReferencia] = useState(
    riscoInicial?.km_referencia != null ? String(riscoInicial.km_referencia) : ""
  );
  const [sentido, setSentido] = useState(riscoInicial?.sentido ?? "");
  const [pontoReferencia, setPontoReferencia] = useState(riscoInicial?.ponto_referencia ?? "");
  const [fotoUrl, setFotoUrl] = useState(riscoInicial?.foto_url ?? "");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    riscoInicial ? { lat: riscoInicial.latitude, lng: riscoInicial.longitude } : null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Rodada 60 — riscos já cadastrados, mostrados no mapa conforme os filtros
  // de rota e sentido (os mesmos do módulo Rotas e Riscos).
  const [riscosExistentes, setRiscosExistentes] = useState<PontoRisco[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("rotas")
      .select("*")
      .order("ordem")
      .then(({ data }) => setRotas((data ?? []) as Rota[]));
    supabase
      .from("pontos_risco")
      .select("*")
      .then(({ data }) => setRiscosExistentes((data ?? []) as PontoRisco[]));
  }, []);

  const rotaSelecionada = rotas.find((r) => r.id === rotaId) ?? null;
  const riscosNoMapa = riscosExistentes
    .filter((r) => r.id !== riscoInicial?.id)
    .filter((r) =>
      !rotaSelecionada
        ? true
        : r.km_referencia != null
          ? kmPertenceARota(r.km_referencia, rotaSelecionada.slug)
          : r.rota_id === null || r.rota_id === rotaSelecionada.id
    )
    .filter((r) => !sentido || r.sentido === sentido);

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
    const path = `${user.id}/${riscoInicial?.id ?? "novo"}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("risco-fotos")
      .upload(path, file, { upsert: true });
    setEnviandoFoto(false);
    if (uploadError) {
      setErro("Não foi possível enviar a foto: " + uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("risco-fotos").getPublicUrl(path);
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
      setErro("Marque a localização do risco no mapa (ou use sua localização atual).");
      return;
    }
    setLoading(true);
    const { error } = await onSalvar({
      titulo,
      descricao: descricao || null,
      latitude: coords.lat,
      longitude: coords.lng,
      br: br as Br,
      km_referencia: kmReferencia ? Number(kmReferencia) : null,
      sentido: sentido || null,
      ponto_referencia: pontoReferencia || null,
      tipo,
      nivel_risco: Number(nivelRisco),
      rota_id: rotaId || null,
      foto_url: fotoUrl || null,
    });
    setLoading(false);
    if (error) setErro(error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="card">
        <h3 className="mb-3 text-base font-bold text-red-700">Localização</h3>
        <button
          type="button"
          onClick={usarLocalizacaoAtual}
          className="btn-secondary mb-3 flex items-center gap-2"
        >
          <LocateFixed size={18} /> Usar minha localização atual
        </button>
        <p className="mb-2 text-xs text-neutral-500">Ou toque no mapa para marcar o ponto exato.</p>
        {/* Rodada 60 — filtros de rota e sentido iguais aos do módulo Rotas e
            Riscos: definem a rota/sentido deste risco e mostram no mapa os
            riscos já cadastrados nessa rota/sentido (bandeiras). */}
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRotaId("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!rotaId ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"}`}
          >
            Ambas as rotas
          </button>
          {rotas.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRotaId(r.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${rotaId === r.id ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"}`}
            >
              {nomeRota(r)}
              {ROTA_FAIXA_KM[r.slug] ? ` (${ROTA_FAIXA_KM[r.slug]})` : ""}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSentido("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!sentido ? "bg-red-700 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"}`}
          >
            Ambos os sentidos
          </button>
          {SENTIDO_PISTA_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSentido(o.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${sentido === o.value ? "bg-red-700 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-neutral-500">
          {riscosNoMapa.length} risco(s) já cadastrado(s) nesta rota/sentido aparecem no mapa como bandeiras.
        </p>
        <MapView
          pontosRisco={riscosNoMapa}
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
        <h3 className="mb-3 text-base font-bold text-red-700">Dados do risco</h3>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-red-200 bg-neutral-100 dark:border-red-900 dark:bg-neutral-800">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="Foto do local de risco" className="h-full w-full object-cover" />
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
              <Upload size={16} /> {enviandoFoto ? "Enviando..." : "Enviar foto do risco"}
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
          <div className="sm:col-span-2">
            <label className="label">Título</label>
            <input required className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nível de risco</label>
            <select className="input" value={nivelRisco} onChange={(e) => setNivelRisco(e.target.value)}>
              {Object.entries(NIVEL_RISCO_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
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
            <label className="label">Km de referência</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={kmReferencia}
              onChange={(e) => setKmReferencia(e.target.value)}
            />
          </div>
          <div className="text-xs text-neutral-500 sm:col-span-2">
            Rota: <strong>{rotaSelecionada ? nomeRota(rotaSelecionada) : "Ambas as rotas"}</strong> — Sentido:{" "}
            <strong>{SENTIDO_PISTA_OPTIONS.find((o) => o.value === sentido)?.label ?? "Não informado"}</strong> (escolha nos
            botões acima do mapa).
          </div>
          <div className="sm:col-span-2">
            <label className="label">Ponto de referência (opcional)</label>
            <input
              className="input"
              placeholder="Ex: próximo ao trevo de acesso, em frente à borracharia..."
              value={pontoReferencia}
              onChange={(e) => setPontoReferencia(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea
              className="input"
              rows={3}
              value={descricao ?? ""}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
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
