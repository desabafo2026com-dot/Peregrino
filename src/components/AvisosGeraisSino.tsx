"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Rodada 45 — avisos da administração para todo mundo que abre o app
// (logado ou não), cadastrados em /admin/avisos (tabela avisos_gerais,
// Migration 40). O sininho só aparece enquanto houver algum aviso vigente
// (a RLS já esconde os vencidos) e fica pulsando, com a contagem, enquanto
// houver aviso ainda não aberto neste aparelho. Ao abrir, todos os avisos
// mostrados contam como lidos.
//
// "Lido" fica guardado no próprio aparelho (localStorage): funciona igual
// para quem não tem conta, e não precisa de tabela de leitura por pessoa.
// Se o armazenamento do navegador estiver bloqueado, o sininho continua
// funcionando — só volta a pulsar na próxima visita.

interface AvisoGeral {
  id: string;
  titulo: string;
  mensagem: string;
  criado_em: string;
}

const CHAVE_LIDOS = "peregrino_avisos_lidos";
const ATUALIZAR_A_CADA_MS = 5 * 60 * 1000;

function lerLidos(): string[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE_LIDOS);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista)
      ? lista.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function gravarLidos(ids: string[]) {
  try {
    window.localStorage.setItem(CHAVE_LIDOS, JSON.stringify(ids));
  } catch {
    // armazenamento indisponível (aba anônima, bloqueio do navegador)
  }
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AvisosGeraisSino() {
  const [avisos, setAvisos] = useState<AvisoGeral[]>([]);
  const [lidos, setLidos] = useState<string[]>([]);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("avisos_gerais")
      .select("id, titulo, mensagem, criado_em")
      .order("criado_em", { ascending: false })
      .then(({ data, error }) => {
        // Sem a Migration 40 aplicada a tabela não existe — o sininho só
        // não aparece, sem quebrar nada.
        if (error) return;
        const lista = (data ?? []) as AvisoGeral[];
        setAvisos(lista);
        // Guarda só os ids ainda vigentes, para a lista não crescer para
        // sempre no aparelho.
        const vigentes = new Set(lista.map((a) => a.id));
        const lidosVigentes = lerLidos().filter((id) => vigentes.has(id));
        gravarLidos(lidosVigentes);
        setLidos(lidosVigentes);
      });
  }, []);

  useEffect(() => {
    carregar();
    const timer = window.setInterval(carregar, ATUALIZAR_A_CADA_MS);
    return () => window.clearInterval(timer);
  }, [carregar]);

  if (avisos.length === 0) return null;

  const naoLidos = avisos.filter((a) => !lidos.includes(a.id));

  function abrir() {
    setAberto(true);
    const todos = avisos.map((a) => a.id);
    gravarLidos(todos);
    // Os "novos" continuam destacados enquanto o painel está aberto; o
    // estado de lido é aplicado ao fechar.
  }

  function fechar() {
    setAberto(false);
    setLidos(avisos.map((a) => a.id));
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={
          naoLidos.length > 0 ? `${naoLidos.length} aviso(s) novo(s)` : "Avisos"
        }
        title="Avisos"
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
      >
        {naoLidos.length > 0 && (
          <span
            className="absolute inset-0.5 animate-ping rounded-full bg-amber-400/60"
            aria-hidden="true"
          />
        )}
        <Bell
          size={20}
          className={`relative ${
            naoLidos.length > 0
              ? "text-amber-700 dark:text-amber-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        />
        {naoLidos.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {naoLidos.length}
          </span>
        )}
      </button>

      {aberto &&
        // Portal para o <body>: o cabeçalho (onde o sininho fica) usa
        // backdrop-blur, e isso faz um "position: fixed" dentro dele ficar
        // preso ao próprio cabeçalho em vez da tela inteira. z-50: acima do
        // botão de emergência (z-40), mesma convenção dos outros modais.
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            onClick={fechar}
          >
            <div
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
                <h2 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-500">
                  <Bell size={18} /> Avisos do O Peregrino
                </h2>
                <button onClick={fechar} aria-label="Fechar">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto p-4">
                {avisos.map((a) => {
                  const novo = !lidos.includes(a.id);
                  return (
                    <article
                      key={a.id}
                      className={`rounded-xl border p-3 ${
                        novo
                          ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                          : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <p className="mb-1 flex flex-wrap items-center gap-2 font-bold">
                        {a.titulo}
                        {novo && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            NOVO
                          </span>
                        )}
                      </p>
                      <p className="text-sm whitespace-pre-line text-neutral-700 dark:text-neutral-200">
                        {a.mensagem}
                      </p>
                      <p className="mt-2 text-xs text-neutral-400">
                        Publicado em {dataHora(a.criado_em)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
