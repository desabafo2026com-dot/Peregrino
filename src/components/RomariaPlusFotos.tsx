"use client";

import { useState } from "react";
import { Check, Plus, Pencil, Download, Share2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import RomariaPlusView, { type Modelo } from "@/components/RomariaPlusView";
import RomariaPlusComprarExtra from "@/components/RomariaPlusComprarExtra";
import { ROMARIA_PLUS_FOTOS_POR_PACOTE } from "@/lib/constants";
import type { Certificado, CompraRomariaPlus, RomariaPlusFoto } from "@/types/database";

interface Props {
  certificado: Certificado;
  compraId: string;
  userId: string;
  fotosIniciais: RomariaPlusFoto[];
  // Pacotes extra de +5 fotos (Rodada 30) já pagos para esta compra — cada
  // um libera mais 5 índices na MESMA galeria (ver MAX_FOTOS abaixo).
  pacotesExtraPagos: number;
  // Pacote extra mais recente ainda pendente (voltando do Mercado Pago).
  pacoteExtraPendente: CompraRomariaPlus | null;
  // Rodada 49 — cidades com check-in, na ordem (carimbos da "Credencial").
  cidadesCheckin?: string[];
  ehAdmin?: boolean;
}

const MAX_FOTOS_INICIAL = 5;

// Galeria de até 5 fotos/artes independentes por compra da Romaria Plus
// (Rodada 18 — antes só existia uma foto por compra). A pessoa trabalha
// numa foto de cada vez: escolhe o slot pelas abas acima da prévia, e só
// pode abrir um slot novo depois de já ter uma foto salva no anterior (ou
// se ainda não usou nenhum dos 5). O componente de edição em si
// (RomariaPlusView) não muda de comportamento, só passa a operar sobre um
// índice específico em vez de "a" foto da compra. Rodada 30: o teto de 5
// deixou de ser fixo — cada pacote extra pago soma mais
// ROMARIA_PLUS_FOTOS_POR_PACOTE ao limite (ver MAX_FOTOS).
export default function RomariaPlusFotos({
  certificado,
  compraId,
  userId,
  fotosIniciais,
  pacotesExtraPagos,
  pacoteExtraPendente,
  cidadesCheckin = [],
  ehAdmin = false,
}: Props) {
  const MAX_FOTOS = MAX_FOTOS_INICIAL + ROMARIA_PLUS_FOTOS_POR_PACOTE * pacotesExtraPagos;
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

  // Rodada 56 — abre direto na primeira foto ainda não salva (as salvas
  // continuam nas abas, para baixar/compartilhar de novo).
  const [slotAtivo, setSlotAtivo] = useState<number>(() => {
    const pendente = indicesExistentes.find((i) => !fotos[i]?.arte_url);
    if (pendente) return pendente;
    if (indicesExistentes.length < MAX_FOTOS) return proximoIndiceLivre;
    return indicesExistentes[0] ?? 1;
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const salvas = indicesExistentes.filter((i) => !!fotos[i]?.arte_url).length;

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

  // Rodada 56 — primeiro download/compartilhamento de uma arte: ela fica
  // guardada e a galeria passa sozinha para a próxima foto livre.
  function aoSalvarArte(dados: { indice: number; arte_url: string; evento: "download" | "compartilhamento" }) {
    const atualizadas: Record<number, RomariaPlusFoto> = { ...fotos };
    const atual = atualizadas[dados.indice];
    if (atual) {
      atualizadas[dados.indice] = {
        ...atual,
        arte_url: dados.arte_url,
        arte_salva_em: new Date().toISOString(),
        contador_downloads: atual.contador_downloads + (dados.evento === "download" ? 1 : 0),
        contador_compartilhamentos: atual.contador_compartilhamentos + (dados.evento === "compartilhamento" ? 1 : 0),
      };
    }
    setFotos(atualizadas);
    const existentes = Object.keys(atualizadas)
      .map(Number)
      .sort((a, b) => a - b);
    const pendente = existentes.find((i) => !atualizadas[i]?.arte_url);
    const proximaLivre = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
    const proxima = pendente ?? (existentes.length < MAX_FOTOS ? proximaLivre : null);
    if (proxima) {
      setAviso(`Foto ${dados.indice} salva na sua galeria! Agora você pode criar a Foto ${proxima}.`);
      setSlotAtivo(proxima);
    } else {
      setAviso(`Foto ${dados.indice} salva na sua galeria! Você usou todas as ${MAX_FOTOS} fotos.`);
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
              onClick={() => {
                setSlotAtivo(i);
                setAviso(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                slotAtivo === i
                  ? "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              {existe && fotos[i]?.arte_url && <Check size={13} className="text-green-600 dark:text-green-400" />}
              {existe && !fotos[i]?.arte_url && <Pencil size={13} />}
              {ehNova && <Plus size={13} />}
              {ehNova ? "Nova foto" : `Foto ${i}`}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-neutral-400">
        {salvas} de {MAX_FOTOS} fotos salvas — pode fazer uma de cada vez, no seu tempo.
      </p>

      {aviso && (
        <p
          className="mx-auto flex max-w-sm items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 dark:bg-green-950/40 dark:text-green-300"
          style={{ textAlign: "left" }}
        >
          <CheckCircle2 size={18} className="shrink-0" /> {aviso}
        </p>
      )}

      {fotoDoSlotAtivo?.arte_url ? (
        <ArteSalva key={slotAtivo} foto={fotoDoSlotAtivo} codigo={certificado.codigo} compraId={compraId} />
      ) : (
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
        cidadesCheckin={cidadesCheckin}
        ehAdmin={ehAdmin}
        onSalvo={aoSalvar}
        onArteSalva={aoSalvarArte}
      />
      )}

      {/* Pacote extra de +5 fotos (Rodada 30) — só aparece depois que todos
          os slots liberados até agora já foram usados, exatamente como
          pedido pelo usuário ("a opção só fica disponível após o usuário
          completar as 5 que ele adquiriu"). */}
      {/* Rodada 57 — "adquirir mais 5" aparece quando TODAS as fotos
          liberadas até agora já foram salvas (baixadas/compartilhadas). */}
      {(salvas >= MAX_FOTOS || pacoteExtraPendente) && (
        <RomariaPlusComprarExtra compraId={compraId} pacoteExtraPendenteInicial={pacoteExtraPendente} />
      )}
    </div>
  );
}

// Rodada 56 — uma arte já salva: mostra a imagem pronta e deixa baixar ou
// compartilhar de novo quantas vezes quiser (sem editar).
function ArteSalva({ foto, codigo, compraId }: { foto: RomariaPlusFoto; codigo: string; compraId: string }) {
  const [ocupado, setOcupado] = useState<null | "baixar" | "compartilhar">(null);
  const [downloads, setDownloads] = useState(foto.contador_downloads);
  const [compartilhamentos, setCompartilhamentos] = useState(foto.contador_compartilhamentos);
  const [erro, setErro] = useState<string | null>(null);
  const nome = `romaria-plus-${codigo}-${foto.indice}.png`;

  function registrar(evento: "download" | "compartilhamento") {
    if (evento === "download") setDownloads((n) => n + 1);
    else setCompartilhamentos((n) => n + 1);
    createClient()
      .rpc("registrar_evento_foto_romaria_plus", { p_compra_id: compraId, p_indice: foto.indice, p_evento: evento })
      .then(() => {});
  }

  async function obterArquivo() {
    const resposta = await fetch(foto.arte_url as string, { cache: "no-store" });
    if (!resposta.ok) throw new Error("falha ao baixar");
    const blob = await resposta.blob();
    return new File([blob], nome, { type: "image/png" });
  }

  function salvarNoAparelho(arquivo: File) {
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.download = nome;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function baixar() {
    setErro(null);
    setOcupado("baixar");
    try {
      salvarNoAparelho(await obterArquivo());
      registrar("download");
    } catch {
      setErro("Não foi possível baixar agora. Verifique a internet e tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  async function compartilhar() {
    setErro(null);
    setOcupado("compartilhar");
    try {
      const arquivo = await obterArquivo();
      if (navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], text: "Minha peregrinação até Aparecida-SP!" });
          registrar("compartilhamento");
        } catch {
          // cancelado — sem problema
        }
      } else {
        salvarNoAparelho(arquivo);
        registrar("download");
      }
    } catch {
      setErro("Não foi possível compartilhar agora. Verifique a internet e tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.arte_url as string}
        alt={`Arte da Foto ${foto.indice}`}
        className="w-full max-w-sm rounded-2xl shadow-lg"
      />
      <p className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
        <CheckCircle2 size={14} /> Foto {foto.indice} salva
        {foto.arte_salva_em ? ` em ${new Date(foto.arte_salva_em).toLocaleDateString("pt-BR")}` : ""}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={compartilhar} disabled={ocupado !== null} className="btn-primary flex items-center gap-2">
          <Share2 size={16} /> {ocupado === "compartilhar" ? "Abrindo..." : "Compartilhar"}
        </button>
        <button onClick={baixar} disabled={ocupado !== null} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> {ocupado === "baixar" ? "Baixando..." : "Baixar de novo"}
        </button>
      </div>
      {(downloads > 0 || compartilhamentos > 0) && (
        <p className="text-xs text-neutral-400">
          {downloads > 0 && `Baixada ${downloads}x`}
          {downloads > 0 && compartilhamentos > 0 && " · "}
          {compartilhamentos > 0 && `Compartilhada ${compartilhamentos}x`}
        </p>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
