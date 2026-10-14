import Link from "next/link";
import { TriangleAlert, Plus, MapPin, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import AvisoNaoEBoletim from "@/components/AvisoNaoEBoletim";
import { PERIODO_DIA_LABELS, SENTIDO_PISTA_LABELS, TIPOS_OCORRENCIA_DUTRA, TIPO_OCORRENCIA_LABELS } from "@/lib/constants";
import { dataBR } from "@/lib/datas-br";

export const metadata = {
  title: "Ocorrências na Dutra — O Peregrino",
};

interface OcorrenciaPublica {
  id: string;
  tipo: string;
  data_ocorrido: string;
  periodo: string | null;
  km: number | null;
  sentido_pista: string | null;
  cidade: string | null;
  descricao: string;
  envolveu_peregrino: boolean;
}

// Rodada 68 — ocorrências na Dutra aprovadas pela administração (de
// qualquer ano), do km mais alto para o mais baixo (sentido São Paulo →
// Aparecida). Quem registrou não é identificado.
export default async function OcorrenciasPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase
    .from("ocorrencias_dutra_publicas")
    .select("*")
    .order("km", { ascending: false, nullsFirst: false })
    .order("data_ocorrido", { ascending: false })
    .limit(300);
  if (tipo && TIPO_OCORRENCIA_LABELS[tipo]) consulta = consulta.eq("tipo", tipo);
  const { data } = await consulta;
  const lista = (data ?? []) as OcorrenciaPublica[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <VoltarButton href="/" />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <TriangleAlert size={24} className="text-red-600" /> Ocorrências na Dutra
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "left" }}>
        O que já aconteceu na rodovia, contado por peregrinos e analisado pela administração. Use para redobrar o
        cuidado nesses pontos.
      </p>
      <Link href="/ocorrencias/nova" className="btn-primary flex items-center justify-center gap-2">
        <Plus size={18} /> Registrar uma ocorrência
      </Link>
      <AvisoNaoEBoletim />

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/ocorrencias"
          className={`rounded-full px-3 py-1 font-semibold ${!tipo ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}
        >
          Todas
        </Link>
        {TIPOS_OCORRENCIA_DUTRA.map((t) => (
          <Link
            key={t.value}
            href={`/ocorrencias?tipo=${t.value}`}
            className={`rounded-full px-3 py-1 font-semibold ${tipo === t.value ? "bg-amber-800 text-white" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}
          >
            {t.label.split(" (")[0]}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="card text-sm text-neutral-500">Nenhuma ocorrência publicada{tipo ? " deste tipo" : ""} ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((o) => (
            <li key={o.id} className="card flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
                  {TIPO_OCORRENCIA_LABELS[o.tipo] ?? o.tipo}
                </span>
                {o.km != null && <span>km {o.km}</span>}
                {o.sentido_pista && (
                  <span className="text-xs font-semibold text-neutral-500">{SENTIDO_PISTA_LABELS[o.sentido_pista]}</span>
                )}
              </p>
              <p className="flex flex-wrap gap-x-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} /> {dataBR(o.data_ocorrido)}
                  {o.periodo ? ` · ${PERIODO_DIA_LABELS[o.periodo]}` : ""}
                </span>
                {o.cidade && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {o.cidade}
                  </span>
                )}
                {o.envolveu_peregrino && <span className="font-semibold text-red-700">Envolveu peregrino</span>}
              </p>
              <p className="text-sm text-neutral-700 dark:text-neutral-200" style={{ textAlign: "left" }}>
                {o.descricao}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
