"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  SERVICOS_PONTO_APOIO,
  SENTIDO_PISTA_OPTIONS,
  CIDADES_DUTRA_SP_QUELUZ,
  BR_OPTIONS,
} from "@/lib/constants";
import { LocateFixed } from "lucide-react";
import CalendarioDatas from "@/components/CalendarioDatas";
import type { PontoApoio, SentidoPista, Br, PapPreCadastro } from "@/types/database";

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
  br: Br;
  sentido_pista: SentidoPista | null;
  periodo_funcionamento: string | null;
  datas_funcionamento: string[];
  servicos: string[];
  aceita_doacoes: boolean;
  doacao_necessidade: string | null;
  contato_doacao: string | null;
  observacoes: string | null;
  pre_cadastro_id: string | null;
}

function formatarPeriodo(is24h: boolean, abertura: string, fechamento: string) {
  if (is24h) return "Aberto 24h";
  if (abertura && fechamento) return `${abertura}–${fechamento}`;
  return null;
}

interface Props {
  pontoInicial?: PontoApoio;
  // Quando o gerente veio de "vincular um PAP já pré-cadastrado", os dados
  // públicos da base (nome/cidade/BR/km/sentido) já chegam prontos aqui —
  // ela só completa o resto (localização exata, telefone, calendário etc.).
  preCadastro?: PapPreCadastro | null;
  onSalvar: (dados: PapFormDados) => Promise<{ error?: string }>;
  submitLabel: string;
  submitLoadingLabel: string;
}

export default function PapForm({
  pontoInicial,
  preCadastro,
  onSalvar,
  submitLabel,
  submitLoadingLabel,
}: Props) {
  const [nome, setNome] = useState(pontoInicial?.nome ?? preCadastro?.nome ?? "");
  const [cidade, setCidade] = useState(pontoInicial?.cidade ?? preCadastro?.cidade ?? "");
  const [br, setBr] = useState<string>(pontoInicial?.br ?? preCadastro?.br ?? "116");
  const [sentidoPista, setSentidoPista] = useState<string>(
    pontoInicial?.sentido_pista ?? preCadastro?.sentido_pista ?? ""
  );
  const [responsavel, setResponsavel] = useState(pontoInicial?.responsavel ?? "");
  const [telefone, setTelefone] = useState(pontoInicial?.telefone ?? "");
  const [exibirTelefone, setExibirTelefone] = useState(pontoInicial?.exibir_telefone ?? true);
  const [kmReferencia, setKmReferencia] = useState(
    pontoInicial?.km_referencia != null
      ? String(pontoInicial.km_referencia)
      : preCadastro?.km != null
        ? String(preCadastro.km)
        : ""
  );
  const [is24h, setIs24h] = useState(pontoInicial?.periodo_funcionamento === "Aberto 24h");
  const [horarioAbertura, setHorarioAbertura] = useState("");
  const [horarioFechamento, setHorarioFechamento] = useState("");
  const [datasFuncionamento, setDatasFuncionamento] = useState<string[]>(
    pontoInicial?.datas_funcionamento ?? []
  );
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
    const periodoNovo = formatarPeriodo(is24h, horarioAbertura, horarioFechamento);
    const { error } = await onSalvar({
      nome,
      responsavel: responsavel || null,
      telefone: telefone || null,
      exibir_telefone: exibirTelefone,
      latitude: coords.lat,
      longitude: coords.lng,
      km_referencia: kmReferencia ? Number(kmReferencia) : null,
      cidade: cidade || null,
      br: br as Br,
      sentido_pista: (sentidoPista || null) as SentidoPista | null,
      // Se nenhum dia foi marcado agora, preserva o período que já estava
      // salvo (texto livre de antes desta mudança) em vez de apagá-lo.
      periodo_funcionamento: periodoNovo ?? pontoInicial?.periodo_funcionamento ?? null,
      datas_funcionamento: datasFuncionamento,
      servicos,
      aceita_doacoes: aceitaDoacoes,
      doacao_necessidade: aceitaDoacoes ? doacaoNecessidade || null : null,
      contato_doacao: contatoDoacao || null,
      observacoes: observacoes || null,
      pre_cadastro_id: pontoInicial?.pre_cadastro_id ?? preCadastro?.id ?? null,
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
        {preCadastro && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Dados vindos da base pública de PAPs — confira e complete o que faltar.
            {preCadastro.data_funcionamento_texto && (
              <>
                {" "}Data de funcionamento sugerida (revise para o ano atual):{" "}
                <strong>{preCadastro.data_funcionamento_texto}</strong>.
              </>
            )}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome do local</label>
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
            <select
              required
              className="input"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            >
              <option value="" disabled>
                Selecione
              </option>
              {pontoInicial?.cidade && !CIDADES_DUTRA_SP_QUELUZ.includes(pontoInicial.cidade) && (
                <option value={pontoInicial.cidade}>{pontoInicial.cidade} (cadastro anterior)</option>
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
          <div className="sm:col-span-2">
            <label className="label">Datas em que o PAP estará ativo (calendário)</label>
            <p className="mb-2 text-xs text-neutral-500">
              Marque dias específicos ou um período no calendário abaixo — somente nessas datas o
              PAP aparece como ativo na contagem e no mapa da página inicial.
            </p>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <CalendarioDatas value={datasFuncionamento} onChange={setDatasFuncionamento} />
            </div>

            <label className="label mt-4">Horário de funcionamento</label>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={is24h}
                onChange={(e) => setIs24h(e.target.checked)}
              />
              Funciona 24 horas
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Horário de abertura</label>
                <input
                  type="time"
                  className="input disabled:opacity-50"
                  disabled={is24h}
                  value={horarioAbertura}
                  onChange={(e) => setHorarioAbertura(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Horário de encerramento</label>
                <input
                  type="time"
                  className="input disabled:opacity-50"
                  disabled={is24h}
                  value={horarioFechamento}
                  onChange={(e) => setHorarioFechamento(e.target.value)}
                />
              </div>
            </div>
            {pontoInicial?.periodo_funcionamento && !is24h && !horarioAbertura && !horarioFechamento && (
              <p className="mt-2 text-xs text-neutral-500">
                Período atual: {pontoInicial.periodo_funcionamento}. Preencha os horários acima
                para alterá-lo.
              </p>
            )}
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
