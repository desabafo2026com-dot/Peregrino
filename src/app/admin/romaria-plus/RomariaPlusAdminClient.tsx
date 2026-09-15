"use client";

import { useRef, useState } from "react";
import { Download, Upload, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CompraRomariaPlus } from "@/types/database";

export interface CompraComCertificado extends CompraRomariaPlus {
  certificados: { nome_peregrino: string; codigo: string } | null;
}

const MODELO_LABEL: Record<string, string> = {
  classico: "Clássico",
  destaque: "Foto em destaque",
  painel: "Painel flutuante",
  moldura: "Moldura dourada",
};

// Fora do componente de propósito (ver mesmo comentário em
// RomariaPlusView.tsx): o lint de pureza de hooks trata `Date.now()` como
// impuro mesmo dentro de um handler de clique, se a função estiver
// declarada dentro do componente.
async function enviarFotoParaStorage(caminho: string, arquivo: File) {
  const supabase = createClient();
  const { error: erroUpload } = await supabase.storage
    .from("romaria-plus-fotos")
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || "image/jpeg" });
  if (erroUpload) throw erroUpload;
  const { data } = supabase.storage.from("romaria-plus-fotos").getPublicUrl(caminho);
  return `${data.publicUrl}?v=${Date.now()}`;
}

// Lista de admin para ver, baixar e — se preciso — substituir a foto que
// cada peregrino escolheu para a Romaria Plus (Rodada 15). Antes essas
// fotos só existiam na memória do navegador de quem comprou; agora ficam
// persistidas (bucket romaria-plus-fotos) e aparecem aqui.
export default function RomariaPlusAdminClient({
  comprasIniciais,
}: {
  comprasIniciais: CompraComCertificado[];
}) {
  const [compras, setCompras] = useState(comprasIniciais);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [erroId, setErroId] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  async function substituirFoto(compra: CompraComCertificado, arquivo: File) {
    setEnviandoId(compra.id);
    setErroId(null);
    try {
      const supabase = createClient();
      const caminho = `${compra.user_id}/${compra.id}.jpg`;
      const novaUrl = await enviarFotoParaStorage(caminho, arquivo);
      const { error: erroUpdate } = await supabase
        .from("compras_romaria_plus")
        .update({ foto_url: novaUrl })
        .eq("id", compra.id);
      if (erroUpdate) throw erroUpdate;
      setCompras((prev) => prev.map((c) => (c.id === compra.id ? { ...c, foto_url: novaUrl } : c)));
    } catch {
      setErroId(compra.id);
    } finally {
      setEnviandoId(null);
    }
  }

  if (compras.length === 0) {
    return <p className="text-sm text-neutral-400">Nenhuma compra da Romaria Plus paga ainda.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {compras.map((c) => (
        <div key={c.id} className="card flex flex-col gap-2">
          <input
            ref={(el) => {
              inputsRef.current[c.id] = el;
            }}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) void substituirFoto(c, arquivo);
            }}
          />
          <p className="font-semibold">{c.certificados?.nome_peregrino ?? "Peregrino"}</p>
          <p className="text-xs text-neutral-500">
            Código: {c.certificados?.codigo ?? "-"}
            {c.ano != null ? ` — ano ${c.ano}` : ""}
            {c.modelo ? ` — modelo ${MODELO_LABEL[c.modelo] ?? c.modelo}` : ""}
          </p>

          {c.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.foto_url}
              alt={`Foto escolhida por ${c.certificados?.nome_peregrino ?? "peregrino"}`}
              className="h-40 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
              <ImageOff size={28} />
            </div>
          )}

          <div className="mt-1 flex flex-wrap gap-2">
            {c.foto_url && (
              <a
                href={c.foto_url}
                download={`romaria-plus-${c.certificados?.codigo ?? c.id}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-xs"
              >
                <Download size={14} /> Baixar foto
              </a>
            )}
            <button
              type="button"
              disabled={enviandoId === c.id}
              onClick={() => inputsRef.current[c.id]?.click()}
              className="btn-secondary flex items-center gap-2 text-xs"
            >
              <Upload size={14} /> {enviandoId === c.id ? "Enviando..." : c.foto_url ? "Substituir foto" : "Enviar foto"}
            </button>
          </div>
          {erroId === c.id && (
            <p className="text-xs text-red-600">Não foi possível salvar a foto agora. Tente novamente.</p>
          )}
        </div>
      ))}
    </div>
  );
}
