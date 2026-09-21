"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import RomariaPlusView, { type Modelo } from "@/components/RomariaPlusView";
import type { Certificado, RomariaPlusFoto } from "@/types/database";

interface Props {
  certificado: Certificado;
  compraId: string;
  userId: string;
  fotosIniciais: RomariaPlusFoto[];
}

const MAX_FOTOS = 5;

// Galeria de até 5 fotos/artes independentes por compra da Romaria Plus
// (Rodada 18 — antes só existia uma foto por compra). A pessoa trabalha
// numa foto de cada vez: escolhe o slot pelas abas acima da prévia, e só
// pode abrir um slot novo depois de já ter uma foto salva no anterior (ou
// se ainda não usou nenhum dos 5). O componente de edição em si
// (RomariaPlusView) não muda de comportamento, só passa a operar sobre um
// índice específico em vez de "a" foto da compra.
export default function RomariaPlusFotos({ certificado, compraId, userId, fotosIniciais }: Props) {
  const [fotos, setFotos] = useState<Record<number, RomariaPlusFoto>>(() => {
    const mapa: Record<number, RomariaPlusFoto> = {};
    fotosIniciais.forEach((f) => {
      mapa[f.indice] = f;
    });
    return mapa;
  });

  const indicesExistentes = Object.keys(fotos)
    .map(Number)
    .sort((a, b) => a - b);
  const proximoIndiceLivre = indicesExistentes.length > 0 ? Math.max(...indicesExistentes) + 1 : 1;
  const podeAdicionarNova = indicesExistentes.length < MAX_FOTOS;

  const [slotAtivo, setSlotAtivo] = useState<number>(indicesExistentes[0] ?? 1);

  const abas = [...indicesExistentes];
  if (podeAdicionarNova && !abas.includes(proximoIndiceLivre)) abas.push(proximoIndiceLivre);

  function aoSalvar(dados: { indice: number; foto_url: string; modelo: Modelo; ajuste_overlay: RomariaPlusFoto["ajuste_overlay"] }) {
    setFotos((prev) => ({
      ...prev,
      [dados.indice]: {
        ...(prev[dados.indice] ?? {
          id: "",
          compra_id: compraId,
          user_id: userId,
          contador_downloads: 0,
          contador_compartilhamentos: 0,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        }),
        indice: dados.indice,
        foto_url: dados.foto_url,
        modelo: dados.modelo,
        ajuste_overlay: dados.ajuste_overlay,
      },
    }));
  }

  const fotoDoSlotAtivo = fotos[slotAtivo] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {abas.map((i) => {
          const existe = i in fotos;
          const ehNova = !existe;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSlotAtivo(i)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                slotAtivo === i
                  ? "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              {existe && <Check size={13} className="text-green-600 dark:text-green-400" />}
              {ehNova && <Plus size={13} />}
              {ehNova ? "Nova foto" : `Foto ${i}`}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-neutral-400">
        {indicesExistentes.length} de {MAX_FOTOS} fotos criadas — pode fazer uma de cada vez, no seu tempo.
      </p>

      <RomariaPlusView
        key={slotAtivo}
        certificado={certificado}
        compraId={compraId}
        userId={userId}
        indice={slotAtivo}
        fotoUrlInicial={fotoDoSlotAtivo?.foto_url ?? null}
        modeloInicial={fotoDoSlotAtivo?.modelo ?? null}
        ajusteInicial={fotoDoSlotAtivo?.ajuste_overlay ?? null}
        contadorDownloadsInicial={fotoDoSlotAtivo?.contador_downloads ?? 0}
        contadorCompartilhamentosInicial={fotoDoSlotAtivo?.contador_compartilhamentos ?? 0}
        onSalvo={aoSalvar}
      />
    </div>
  );
}
