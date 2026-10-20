"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, PenLine, Search } from "lucide-react";
import { buscarMunicipios, carregarMunicipios, rotuloMunicipio, type Municipio } from "@/lib/municipios";

// Rodada 75 — campo de "Cidade de origem" com busca: todos os municípios de
// SP, MG e RJ aparecem conforme a pessoa digita (pelo começo do nome, por
// qualquer palavra ou pelas iniciais) e, no fim da lista, a opção de
// digitar outra cidade (outro estado).
export default function BuscaCidadeOrigem({
  valor,
  onEscolher,
  onOutra,
}: {
  valor: Municipio | null;
  onEscolher: (m: Municipio) => void;
  onOutra: (textoDigitado: string) => void;
}) {
  const [lista, setLista] = useState<Municipio[]>([]);
  const [texto, setTexto] = useState(valor ? rotuloMunicipio(valor) : "");
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixaRef = useRef<HTMLDivElement>(null);
  const idLista = useId();

  useEffect(() => {
    let vivo = true;
    carregarMunicipios().then((l) => {
      if (vivo) setLista(l);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const resultados = buscarMunicipios(lista, texto);
  const totalOpcoes = resultados.length + 1; // + "Outra cidade"

  function escolher(i: number) {
    if (i < resultados.length) {
      const m = resultados[i];
      setTexto(rotuloMunicipio(m));
      onEscolher(m);
    } else {
      onOutra(texto.trim());
    }
    setAberto(false);
  }

  return (
    <div ref={caixaRef} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
        <input
          className="input"
          style={{ paddingLeft: "2.25rem" }}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={idLista}
          aria-autocomplete="list"
          value={texto}
          placeholder={lista.length ? "Digite o nome da cidade (ex.: Taubaté, sjc...)" : "Carregando cidades..."}
          onFocus={() => setAberto(true)}
          onChange={(e) => {
            setTexto(e.target.value);
            setDestaque(0);
            setAberto(true);
          }}
          onKeyDown={(e) => {
            if (!aberto) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setDestaque((d) => Math.min(totalOpcoes - 1, d + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setDestaque((d) => Math.max(0, d - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (texto.trim()) escolher(destaque);
            } else if (e.key === "Escape") {
              setAberto(false);
            }
          }}
        />
      </div>
      {aberto && texto.trim().length > 0 && (
        <ul
          id={idLista}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {resultados.map((m, i) => (
            <li key={`${m.nome}-${m.uf}`} role="option" aria-selected={i === destaque}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === destaque ? "bg-amber-50 dark:bg-amber-950/40" : ""
                }`}
              >
                <MapPin size={14} className="shrink-0 text-amber-700" />
                <span className="flex-1">{m.nome}</span>
                <span className="text-xs font-semibold text-neutral-500">{m.uf}</span>
              </button>
            </li>
          ))}
          {resultados.length === 0 && lista.length > 0 && (
            <li className="px-3 py-2 text-xs text-neutral-500">Nenhuma cidade de SP, MG ou RJ com esse nome.</li>
          )}
          <li role="option" aria-selected={destaque === resultados.length}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(resultados.length)}
              className={`flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-left text-sm font-semibold text-amber-800 dark:border-neutral-800 dark:text-amber-500 ${
                destaque === resultados.length ? "bg-amber-50 dark:bg-amber-950/40" : ""
              }`}
            >
              <PenLine size={14} className="shrink-0" /> Outra cidade (outro estado) — digitar
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
