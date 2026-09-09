"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SERVICOS_PONTO_APOIO } from "@/lib/constants";
import VoltarButton from "@/components/VoltarButton";
import { LocateFixed } from "lucide-react";
import type { Rota } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

export default function NovoPapGerentePage() {
  const router = useRouter();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotaId, setRotaId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [kmReferencia, setKmReferencia] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [servicos, setServicos] = useState<string[]>([]);
  const [contatoDoacao, setContatoDoacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
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
    setServicos((prev) =>
      prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
    );
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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("pontos_apoio").insert({
      criado_por: user?.id,
      gerente_id: user?.id,
      nome,
      responsavel: responsavel || null,
      telefone: telefone || null,
      latitude: coords.lat,
      longitude: coords.lng,
      km_referencia: kmReferencia ? Number(kmReferencia) : null,
      periodo_funcionamento: periodo || null,
      servicos,
      contato_doacao: contatoDoacao || null,
      observacoes: observacoes || null,
      rota_id: rotaId || null,
      status_aprovacao: "pendente",
    });
    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }
    router.push("/gerente-pap");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarButton href="/gerente-pap" />
      <h2 className="mb-1 text-xl font-bold">Cadastrar meu PAP</h2>
      <p className="mb-6 text-sm text-neutral-500">
        PAP — Ponto de Apoio ao Peregrino. Preencha os dados e marque a
        localização exata no mapa para fixar o ponto. Ele fica pendente e só
        aparece no mapa para os peregrinos depois que um administrador
        aprovar a divulgação.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="card">
          <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
            Localização
          </h3>
          <button
            type="button"
            onClick={usarLocalizacaoAtual}
            className="btn-secondary mb-3 flex items-center gap-2"
          >
            <LocateFixed size={18} /> Usar minha localização atual
          </button>
          <p className="mb-2 text-xs text-neutral-500">
            Ou toque no mapa para marcar o ponto exato.
          </p>
          <MapView
            pickMode
            onPick={(lat, lng) => setCoords({ lat, lng })}
            markerPreview={coords ? { lat: coords.lat, lng: coords.lng } : null}
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
          <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
            Dados do PAP
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nome do local</label>
              <input required className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
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
            <div>
              <label className="label">Período de funcionamento</label>
              <input
                className="input"
                placeholder="Ex: todos os dias, 6h-22h"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
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
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea
                className="input"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-base font-bold text-amber-800 dark:text-amber-500">
            Serviços oferecidos
          </h3>
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

        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {erro}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Salvando..." : "Cadastrar PAP"}
        </button>
      </form>
    </div>
  );
}
