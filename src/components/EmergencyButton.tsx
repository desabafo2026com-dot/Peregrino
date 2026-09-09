"use client";

import { useState } from "react";
import { PhoneCall, X, TriangleAlert } from "lucide-react";
import { EMERGENCIAS } from "@/lib/constants";

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-red-600">
                <TriangleAlert size={22} /> Emergência
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
              Toque para ligar diretamente para o número de emergência.
            </p>

            <div className="flex flex-col gap-2">
              {EMERGENCIAS.map((e) => (
                <a
                  key={e.numero}
                  href={`tel:${e.numero}`}
                  className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 active:scale-[0.98] dark:border-red-900 dark:bg-red-950"
                >
                  <div>
                    <div className="font-semibold text-red-700 dark:text-red-300">
                      {e.numero} — {e.nome}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {e.descricao}
                    </div>
                  </div>
                  <PhoneCall className="text-red-600" size={22} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        aria-label="Botão de emergência"
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-4 ring-red-600/20 active:scale-95"
      >
        <TriangleAlert size={28} />
      </button>
    </>
  );
}
