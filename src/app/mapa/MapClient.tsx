"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Tent, TriangleAlert, Megaphone, Route } from "lucide-react";
import type { PontoApoio, PontoRisco, RiscoInformado } from "@/types/database";
import type { RotaLinha, PapPreCadastroMapa } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  pontosApoio: PontoApoio[];
  pontosRisco: PontoRisco[];
  avisos: RiscoInformado[];
  peregrinos: { user_id: string; latitude: number; longitude: number }[];
  rotasLinhas: RotaLinha[];
  papsPreCadastro: PapPreCadastroMapa[];
}

// PAP aparece marcado por padrão (é o que a maioria vem buscar); locais de
// risco e avisos de peregrinos ficam opcionais, para não poluir o mapa de
// quem só quer achar apoio. As rotas Norte/Sul também vêm marcadas por
// padrão, para ajudar a situar os demais elementos na rodovia. PAP
// pré-cadastrados (ainda sem gerente vinculado) também ficam opcionais —
// são localização aproximada, não o PAP confirmado.
export default function MapClient({
  pontosApoio,
  pontosRisco,
  avisos,
  peregrinos,
  rotasLinhas,
  papsPreCadastro,
}: Props) {
  const [mostrarPap, setMostrarPap] = useState(true);
  const [mostrarRisco, setMostrarRisco] = useState(false);
  const [mostrarAvisos, setMostrarAvisos] = useState(false);
  const [mostrarRotas, setMostrarRotas] = useState(true);
  const [mostrarPreCadastro, setMostrarPreCadastro] = useState(false);

  const pontosApoioVisiveis = useMemo(() => (mostrarPap ? pontosApoio : []), [mostrarPap, pontosApoio]);
  const pontosRiscoVisiveis = useMemo(() => (mostrarRisco ? pontosRisco : []), [mostrarRisco, pontosRisco]);
  const avisosVisiveis = useMemo(() => (mostrarAvisos ? avisos : []), [mostrarAvisos, avisos]);
  const rotasVisiveis = useMemo(() => (mostrarRotas ? rotasLinhas : []), [mostrarRotas, rotasLinhas]);
  const papsPreCadastroVisiveis = useMemo(
    () => (mostrarPreCadastro ? papsPreCadastro : []),
    [mostrarPreCadastro, papsPreCadastro]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarRotas}
            onChange={(e) => setMostrarRotas(e.target.checked)}
          />
          <Route size={16} className="text-sky-500" /> Rotas Norte/Sul
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarPap}
            onChange={(e) => setMostrarPap(e.target.checked)}
          />
          <Tent size={16} className="text-green-600" /> PAP ({pontosApoio.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarRisco}
            onChange={(e) => setMostrarRisco(e.target.checked)}
          />
          <TriangleAlert size={16} className="text-red-600" /> Locais de risco ({pontosRisco.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarAvisos}
            onChange={(e) => setMostrarAvisos(e.target.checked)}
          />
          <Megaphone size={16} className="text-orange-600" /> Avisos de peregrinos ({avisos.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarPreCadastro}
            onChange={(e) => setMostrarPreCadastro(e.target.checked)}
          />
          <Tent size={16} className="text-neutral-400" /> PAP aguardando vínculo ({papsPreCadastro.length})
        </label>
      </div>

      {mostrarRotas && rotasLinhas.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
          {rotasLinhas.map((r) => (
            <span key={r.nome} className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-5 rounded-full"
                style={{ backgroundColor: r.cor }}
                aria-hidden="true"
              />
              {r.nome}
            </span>
          ))}
        </div>
      )}

      <MapView
        pontosApoio={pontosApoioVisiveis}
        pontosRisco={pontosRiscoVisiveis}
        avisos={avisosVisiveis}
        peregrinos={peregrinos}
        rotasLinhas={rotasVisiveis}
        papsPreCadastro={papsPreCadastroVisiveis}
        calorPeregrinos={peregrinos.length > 0}
        height="65vh"
      />
    </div>
  );
}
