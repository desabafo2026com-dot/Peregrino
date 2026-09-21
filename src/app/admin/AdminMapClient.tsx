"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Tent, Flag, Megaphone, Flame } from "lucide-react";
import { papAtivoHoje } from "@/lib/constants";
import type { PontoApoio, PontoRisco, RiscoInformado } from "@/types/database";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
      Carregando mapa...
    </div>
  ),
});

interface Props {
  pontosApoio: PontoApoio[];
  pontosRisco: PontoRisco[];
  avisos: RiscoInformado[];
  peregrinos: { user_id: string; latitude: number; longitude: number }[];
}

// Rodada 24, a pedido do usuário: o mapa do painel ganhou filtros próprios
// para cada camada (antes vinha tudo sempre ligado, sem nenhum controle) —
// todas ativas por padrão, mesmo padrão já usado no mapa combinado de
// "Minha peregrinação" desde a Rodada 20. A camada de PAP mostra só os
// realmente ativos hoje (aprovados + dentro do calendário de
// funcionamento) — antes usava aberto_agora (alternado manualmente pelo
// gerente, sem relação com o calendário), o que fazia um PAP sem data de
// hoje marcada continuar aparecendo "ativo" aqui mesmo já tendo sumido do
// mapa público (bug relatado pelo usuário).
export default function AdminMapClient({ pontosApoio, pontosRisco, avisos, peregrinos }: Props) {
  const [mostrarPap, setMostrarPap] = useState(true);
  const [mostrarRiscos, setMostrarRiscos] = useState(true);
  const [mostrarAvisos, setMostrarAvisos] = useState(true);
  const [mostrarCalor, setMostrarCalor] = useState(true);

  const papAtivos = useMemo(
    () =>
      pontosApoio.filter(
        (p) => p.ativo && p.status_aprovacao === "aprovado" && papAtivoHoje(p.datas_funcionamento)
      ),
    [pontosApoio]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={mostrarPap} onChange={(e) => setMostrarPap(e.target.checked)} />
          <Tent size={16} className="text-green-600" /> PAP ativos ({papAtivos.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarRiscos}
            onChange={(e) => setMostrarRiscos(e.target.checked)}
          />
          <Flag size={16} className="text-red-600" /> Riscos cadastrados ({pontosRisco.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={mostrarAvisos}
            onChange={(e) => setMostrarAvisos(e.target.checked)}
          />
          <Megaphone size={16} className="text-orange-600" /> Riscos informados ({avisos.length})
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={mostrarCalor} onChange={(e) => setMostrarCalor(e.target.checked)} />
          <Flame size={16} className="text-red-500" /> Peregrinos em caminhada — mapa de calor (
          {peregrinos.length})
        </label>
      </div>

      <MapView
        pontosApoio={mostrarPap ? papAtivos : []}
        pontosRisco={mostrarRiscos ? pontosRisco : []}
        avisos={mostrarAvisos ? avisos : []}
        peregrinos={mostrarCalor ? peregrinos : []}
        calorPeregrinos={mostrarCalor}
        height="55vh"
      />
    </div>
  );
}
