import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import {
  Tent,
  Phone,
  Clock,
  MapPin,
  HeartHandshake,
  Info,
} from "lucide-react";
import { SENTIDO_PISTA_LABELS, BR_LABELS, SERVICOS_PONTO_APOIO } from "@/lib/constants";
import type { PontoApoio } from "@/types/database";

function servicosLabel(servicos: string[]) {
  if (!servicos.length) return "não informado";
  const labelPorValor = new Map(SERVICOS_PONTO_APOIO.map((s) => [s.value, s.label]));
  return servicos.map((s) => labelPorValor.get(s) ?? s).join(", ");
}

// Página pública (sem exigir login) de um único PAP — o destino do QR code
// gerado em /admin/pap/[id]/qrcode, para o peregrino escanear no local e
// ver as informações do ponto sem precisar abrir o app inteiro.
export default async function PapPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ponto } = await supabase
    .from("pontos_apoio")
    .select("*")
    .eq("id", id)
    .eq("status_aprovacao", "aprovado")
    .maybeSingle();

  if (!ponto) {
    return (
      <div className="mx-auto max-w-md text-center">
        <VoltarButton href="/mapa" />
        <Info className="mx-auto mb-3 text-neutral-400" size={32} />
        <p className="text-neutral-500">
          Este PAP não foi encontrado ou ainda não está disponível
          publicamente.
        </p>
        <Link href="/mapa" className="btn-secondary mt-4 inline-block">
          Ver mapa de apoio
        </Link>
      </div>
    );
  }

  const p = ponto as PontoApoio;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <VoltarButton href="/mapa" />

      {p.foto_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.foto_url}
          alt={p.nome}
          className="h-48 w-full rounded-2xl object-cover"
        />
      )}

      <div className="card">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-500">
          <Tent size={14} /> Ponto de Apoio ao Peregrino
        </p>
        <h1 className="mb-2 text-xl font-bold">{p.nome}</h1>
        <p className="mb-1 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <MapPin size={16} className="shrink-0" />
          {p.cidade ?? "cidade não informada"} — {BR_LABELS[p.br] ?? p.br}
          {p.km_referencia != null ? ` — km ${p.km_referencia}` : ""}
          {p.sentido_pista ? ` (${SENTIDO_PISTA_LABELS[p.sentido_pista] ?? p.sentido_pista})` : ""}
        </p>
        {p.ponto_referencia && (
          <p className="mb-1 text-sm text-neutral-600 dark:text-neutral-300">
            Referência: {p.ponto_referencia}
          </p>
        )}
        {p.periodo_funcionamento && (
          <p className="mb-1 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Clock size={16} className="shrink-0" /> {p.periodo_funcionamento}
          </p>
        )}
        {p.telefone && p.exibir_telefone && (
          <p className="mb-1 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Phone size={16} className="shrink-0" /> {p.telefone}
          </p>
        )}
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Serviços oferecidos: {servicosLabel(p.servicos)}
        </p>
        {p.observacoes && (
          <p className="mt-2 text-sm text-neutral-500">{p.observacoes}</p>
        )}
      </div>

      {p.aceita_doacoes && (
        <div className="card border-amber-200 dark:border-amber-900">
          <p className="mb-1 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-500">
            <HeartHandshake size={18} /> Este PAP aceita doações
          </p>
          {p.doacao_necessidade && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Do que precisa: {p.doacao_necessidade}
            </p>
          )}
          {p.contato_doacao && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Contato: {p.contato_doacao}
            </p>
          )}
        </div>
      )}

      <Link href="/mapa" className="btn-secondary text-center">
        Ver todos os pontos de apoio no mapa
      </Link>
    </div>
  );
}
