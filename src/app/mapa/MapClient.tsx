"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Tent } from "lucide-react";
import type { PontoApoio } from "@/types/database";
import type { PapPreCadastroMapa } from "@/components/MapView";

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
  papsPreCadastro: PapPreCadastroMapa[];
  isAdmin?: boolean;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mesmo critério de "ativo hoje" já usado no contador da home e no popup do
// mapa (ver ativoHoje em MapView.tsx): precisa estar marcado como ativo e
// ter a data de hoje no próprio calendário de funcionamento. PAP sem
// nenhuma data marcada nunca entra no filtro, mesmo estando aprovado.
function papAtivoAgora(p: PontoApoio) {
  return p.ativo && p.datas_funcionamento.length > 0 && p.datas_funcionamento.includes(hojeISO());
}

function preCadastroAtivoAgora(p: PapPreCadastroMapa) {
  const datas = p.datas_funcionamento ?? [];
  return datas.length > 0 && datas.includes(hojeISO());
}

// Rodada 20: a pedido do usuário, esta página passou a mostrar só PAP — as
// camadas de locais de risco, avisos de peregrinos e rotas Norte/Sul (que
// existiam desde as Rodadas 3/4/8) saíram daqui (continuam em /rotas, que
// já tinha seu próprio mapa de riscos). Sobra um único filtro, "PAP ativos
// agora", desmarcado por padrão — todos os PAP (vinculados e aguardando
// vínculo) aparecem de cara, e marcar o filtro estreita para só os que
// estão ativos neste momento (mesmo critério do contador "PAP ativos" da
// home).
export default function MapClient({ pontosApoio, papsPreCadastro, isAdmin = false }: Props) {
  const [somenteAtivos, setSomenteAtivos] = useState(false);

  const pontosApoioVisiveis = useMemo(
    () => (somenteAtivos ? pontosApoio.filter(papAtivoAgora) : pontosApoio),
    [somenteAtivos, pontosApoio]
  );
  const papsPreCadastroVisiveis = useMemo(
    () => (somenteAtivos ? papsPreCadastro.filter(preCadastroAtivoAgora) : papsPreCadastro),
    [somenteAtivos, papsPreCadastro]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={somenteAtivos}
            onChange={(e) => setSomenteAtivos(e.target.checked)}
          />
          <Tent size={16} className="text-green-600" /> PAP ativos agora
        </label>
      </div>

      {(papsPreCadastro.length > 0 || pontosApoio.length > 0) && (
        <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" aria-hidden="true" />
            Confirmado / vinculado a um gerente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-neutral-400 bg-neutral-400" aria-hidden="true" />
            Aguardando vínculo (localização estimada pelo km)
          </span>
        </div>
      )}
      {isAdmin && papsPreCadastro.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          Como administrador, você pode arrastar qualquer marcador cinza tracejado para ajustar a posição exata do PAP.
        </p>
      )}

      <MapView
        pontosApoio={pontosApoioVisiveis}
        papsPreCadastro={papsPreCadastroVisiveis}
        height="65vh"
        permitirArrastarPapPreCadastro={isAdmin}
      />
    </div>
  );
}
