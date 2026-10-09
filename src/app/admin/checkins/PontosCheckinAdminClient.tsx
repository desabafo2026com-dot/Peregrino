"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, MapPin, Plus, Trash2 } from "lucide-react";
import { nomeRota } from "@/lib/constants";
import type { PontoCheckin, Rota } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

// Rodada 60 — posicionar cada cidade sobre a Dutra.
// Rodada 62 — também incluir, editar (nome, km, ordem) e excluir cidades.
interface Edicao {
  id: string | null; // null = cidade nova
  cidade: string;
  km: string;
  ordem: number;
  coords: { lat: number; lng: number } | null;
}

export default function PontosCheckinAdminClient({
  rotas,
  pontosIniciais,
}: {
  rotas: Rota[];
  pontosIniciais: PontoCheckin[];
}) {
  const [pontos, setPontos] = useState(pontosIniciais);
  const [rotaId, setRotaId] = useState(rotas[0]?.id ?? "");
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const daRota = pontos.filter((p) => p.rota_id === rotaId).sort((a, b) => a.ordem - b.ordem);
  const totalNaRota = daRota.length;

  function escolher(p: PontoCheckin) {
    setEdicao({
      id: p.id,
      cidade: p.cidade,
      km: p.km_aproximado != null ? String(p.km_aproximado) : "",
      ordem: daRota.findIndex((x) => x.id === p.id) + 1,
      coords: { lat: p.latitude, lng: p.longitude },
    });
    setMensagem(null);
  }

  function nova() {
    // Por padrão entra antes da última (Aparecida continua sendo a chegada).
    const ultima = daRota[daRota.length - 1];
    const penultima = daRota[daRota.length - 2];
    setEdicao({
      id: null,
      cidade: "",
      km: "",
      ordem: Math.max(1, totalNaRota),
      coords: penultima
        ? { lat: (penultima.latitude + ultima.latitude) / 2, lng: (penultima.longitude + ultima.longitude) / 2 }
        : null,
    });
    setMensagem(null);
  }

  async function recarregar() {
    const { data } = await createClient().from("pontos_checkin").select("*").order("ordem");
    if (data) setPontos(data as PontoCheckin[]);
  }

  async function salvar() {
    if (!edicao) return;
    if (!edicao.cidade.trim()) {
      setMensagem({ tipo: "erro", texto: "Informe o nome da cidade." });
      return;
    }
    if (!edicao.coords) {
      setMensagem({ tipo: "erro", texto: "Toque no mapa para marcar o ponto." });
      return;
    }
    setSalvando(true);
    setMensagem(null);
    const { data, error } = await createClient().rpc("admin_salvar_ponto_checkin", {
      p_id: edicao.id,
      p_rota_id: rotaId,
      p_cidade: edicao.cidade.trim(),
      p_km: edicao.km.trim() ? Number(edicao.km.replace(",", ".")) : null,
      p_latitude: edicao.coords.lat,
      p_longitude: edicao.coords.lng,
      p_ordem: edicao.ordem,
    });
    setSalvando(false);
    if (error) {
      setMensagem({ tipo: "erro", texto: "Não foi possível salvar: " + error.message });
      return;
    }
    await recarregar();
    setEdicao((e) => (e ? { ...e, id: (data as string) ?? e.id } : e));
    setMensagem({ tipo: "ok", texto: `${edicao.cidade.trim()} salva.` });
  }

  async function excluir() {
    if (!edicao?.id) return;
    if (
      !confirm(
        `Excluir o ponto de check-in de ${edicao.cidade}? Os check-ins que peregrinos já fizeram nessa cidade continuam contando, mas ficam sem o nome da cidade.`
      )
    )
      return;
    setSalvando(true);
    const { error } = await createClient().rpc("admin_excluir_ponto_checkin", { p_id: edicao.id });
    setSalvando(false);
    if (error) {
      setMensagem({ tipo: "erro", texto: "Não foi possível excluir: " + error.message });
      return;
    }
    await recarregar();
    setEdicao(null);
    setMensagem({ tipo: "ok", texto: "Ponto de check-in excluído." });
  }

  // Opções de posição na ordem: "1º — antes de X", ...
  const maxOrdem = edicao?.id ? totalNaRota : totalNaRota + 1;
  const opcoesOrdem = Array.from({ length: Math.max(1, maxOrdem) }, (_, i) => i + 1);
  const outras = daRota.filter((p) => p.id !== edicao?.id);
  function descreverOrdem(n: number) {
    const antes = outras[n - 1];
    return antes ? `${n}º — antes de ${antes.cidade}` : `${n}º — no fim`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {rotas.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRotaId(r.id);
              setEdicao(null);
              setMensagem(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${rotaId === r.id ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"}`}
          >
            {nomeRota(r)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {daRota.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => escolher(p)}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${edicao?.id === p.id ? "border-amber-600 bg-amber-50 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" : "border-neutral-200 dark:border-neutral-800"}`}
          >
            <MapPin size={13} /> {daRota.indexOf(p) + 1}. {p.cidade}
          </button>
        ))}
        <button
          type="button"
          onClick={nova}
          className={`flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-sm font-semibold ${edicao && !edicao.id ? "border-amber-600 bg-amber-50 text-amber-800" : "border-amber-400 text-amber-700"}`}
        >
          <Plus size={14} /> Nova cidade
        </button>
      </div>

      {mensagem && !edicao && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          {mensagem.texto}
        </p>
      )}

      {edicao ? (
        <div className="card flex flex-col gap-3">
          <p className="font-bold">{edicao.id ? `Editar ${edicao.cidade || "cidade"}` : "Nova cidade de check-in"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Cidade</label>
              <input
                className="input"
                value={edicao.cidade}
                maxLength={80}
                onChange={(e) => setEdicao({ ...edicao, cidade: e.target.value })}
                placeholder="Ex.: Roseira"
              />
            </div>
            <div>
              <label className="label">Km aproximado (opcional)</label>
              <input
                className="input"
                inputMode="decimal"
                value={edicao.km}
                onChange={(e) => setEdicao({ ...edicao, km: e.target.value })}
                placeholder="Ex.: 150"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Posição na ordem do caminho</label>
              <select
                className="input"
                value={edicao.ordem}
                onChange={(e) => setEdicao({ ...edicao, ordem: Number(e.target.value) })}
              >
                {opcoesOrdem.map((n) => (
                  <option key={n} value={n}>
                    {descreverOrdem(n)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm font-semibold">Toque no mapa, sobre a rodovia, para marcar o ponto.</p>
          <MapView
            key={edicao.id ?? "nova"}
            pickMode
            onPick={(lat, lng) => {
              setEdicao((e) => (e ? { ...e, coords: { lat, lng } } : e));
              setMensagem(null);
            }}
            markerPreview={edicao.coords}
            center={edicao.coords ? [edicao.coords.lng, edicao.coords.lat] : undefined}
            height="420px"
            zoom={edicao.coords ? 13 : 8}
          />
          {edicao.coords && (
            <p className="text-xs text-neutral-500">
              Coordenadas: {edicao.coords.lat.toFixed(5)}, {edicao.coords.lng.toFixed(5)}
            </p>
          )}
          {mensagem && (
            <p
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${mensagem.tipo === "ok" ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}
            >
              {mensagem.tipo === "ok" && <CheckCircle2 size={16} />} {mensagem.texto}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={salvar} disabled={salvando} className="btn-primary flex-1">
              {salvando ? "Salvando..." : edicao.id ? "Salvar alterações" : "Incluir cidade"}
            </button>
            {edicao.id && (
              <button
                type="button"
                onClick={excluir}
                disabled={salvando}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={16} /> Excluir
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Escolha uma cidade acima para editar, ou toque em “Nova cidade”.</p>
      )}
    </div>
  );
}
