"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Hotel, Utensils, Megaphone } from "lucide-react";
import { TIPO_COMERCIO_LABELS, SENTIDO_KM_ABREV } from "@/lib/constants";
import type { PontoComercial } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[65vh] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

function kmSentidoLabel(km: number | null, sentido: string | null) {
  if (km == null) return "km não informado";
  const abrev = sentido ? SENTIDO_KM_ABREV[sentido] : null;
  return `km ${km}${abrev ? ` ${abrev}` : ""}`;
}

export default function HospedagemClient({ comercios }: { comercios: PontoComercial[] }) {
  const [mostrarHoteis, setMostrarHoteis] = useState(true);
  const [mostrarRestaurantes, setMostrarRestaurantes] = useState(true);

  const visiveis = useMemo(
    () =>
      comercios.filter((c) => (c.tipo === "hotel" ? mostrarHoteis : mostrarRestaurantes)),
    [comercios, mostrarHoteis, mostrarRestaurantes]
  );

  const totalHoteis = comercios.filter((c) => c.tipo === "hotel").length;
  const totalRestaurantes = comercios.filter((c) => c.tipo === "restaurante").length;

  return (
    <div className="flex flex-col gap-4">
      {/* "Anuncie Aqui!" — convite para donos de hotel/restaurante
          anunciarem, mostrado antes do mapa, como pedido pelo usuário. */}
      <Link
        href="/perfil"
        className="card flex items-center gap-3 border-amber-300 bg-amber-50 transition hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30"
      >
        <Megaphone className="shrink-0 text-amber-700 dark:text-amber-500" size={26} />
        <div>
          <p className="font-bold text-amber-800 dark:text-amber-500">📢 Anuncie aqui!</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Seu hotel ou restaurante pode aparecer aqui para os peregrinos que passam pela região.
            Fale com a administração pelo &quot;Falar com o desenvolvedor&quot; no seu perfil.
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarHoteis}
            onChange={(e) => setMostrarHoteis(e.target.checked)}
          />
          <Hotel size={16} className="text-blue-600" /> Hotéis ({totalHoteis})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarRestaurantes}
            onChange={(e) => setMostrarRestaurantes(e.target.checked)}
          />
          <Utensils size={16} className="text-violet-600" /> Restaurantes ({totalRestaurantes})
        </label>
      </div>

      {/* O mapa e a lista aparecem sempre, mesmo sem nenhum cadastro ainda —
          antes ficavam escondidos com comercios.length === 0, o que fazia a
          página parecer quebrada assim que alguém abria "Hotéis e
          Restaurantes" pela home antes do primeiro cadastro. */}
      <MapView pontosComerciais={visiveis} height="55vh" />

      <div className="flex flex-col gap-2">
        {comercios.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum hotel ou restaurante cadastrado ainda.</p>
        ) : (
          <>
            {visiveis.map((c) => {
              const Icon = c.tipo === "hotel" ? Hotel : Utensils;
              return (
                <div key={c.id} className="card flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                    {c.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.foto_url} alt={c.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center ${
                          c.tipo === "hotel" ? "text-blue-600" : "text-violet-600"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <Icon size={14} className={c.tipo === "hotel" ? "text-blue-600" : "text-violet-600"} />
                      {c.nome}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {TIPO_COMERCIO_LABELS[c.tipo] ?? c.tipo}
                      {c.cidade ? ` — ${c.cidade}` : ""}
                      {" — "}
                      {kmSentidoLabel(c.km_referencia, c.sentido_pista)}
                    </p>
                    {c.telefone && c.exibir_telefone !== false && (
                      <p className="text-xs text-neutral-500">Telefone: {c.telefone}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {visiveis.length === 0 && (
              <p className="text-sm text-neutral-400">Nenhum resultado com os filtros marcados.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
