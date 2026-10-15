"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CarimboPap, { type DadosCarimbo } from "@/components/CarimboPap";

type Resultado =
  | { status: "carimbado" | "ja_carimbado"; carimbo: DadosCarimbo }
  | { status: "sem_peregrinacao" | "sem_login" | "qr_invalido" | "erro" };

// Rodada 68 — ao abrir a página pelo QR, carimba sozinho (uma vez por PAP
// em cada peregrinação). Sem login ou sem peregrinação em andamento,
// explica o que fazer.
export default function CarimbarAgora({ token, logado }: { token: string; logado: boolean }) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const feito = useRef(false);

  useEffect(() => {
    if (!logado || feito.current) return;
    feito.current = true;
    createClient()
      .rpc("carimbar_pap", { p_token: token })
      .then(({ data, error }) => setResultado(error || !data ? { status: "erro" } : (data as Resultado)));
  }, [logado, token]);

  if (!logado) {
    return (
      <div className="card flex flex-col items-center gap-2 text-center">
        <BookOpen className="text-amber-700" size={28} />
        <p className="font-semibold" style={{ textAlign: "center" }}>
          Carimbe seu caderno de bordo
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
          Entre no app e inicie sua peregrinação para guardar o carimbo deste PAP com data e hora.
        </p>
        <Link href={`/login?redirect=/carimbo/${token}`} className="btn-primary w-full">
          Entrar e carimbar
        </Link>
        {/* Rodada 73 — no iPhone a câmera abre o QR no Safari, que não usa o
            login do app instalado. */}
        <p className="mt-1 text-xs text-neutral-500" style={{ textAlign: "center" }}>
          Já tem o app O Peregrino instalado e está logado nele? Abra o app, vá em Minha peregrinação e toque em
          &quot;Ler QR code do PAP&quot; no caderno de bordo — assim não precisa entrar de novo.
        </p>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="card flex items-center justify-center gap-2 text-sm text-neutral-500">
        <Loader2 size={18} className="animate-spin" /> Carimbando...
      </div>
    );
  }

  if (resultado.status === "carimbado" || resultado.status === "ja_carimbado") {
    return (
      <div className="card flex flex-col items-center gap-3 text-center" style={{ background: "#fbf5e6" }}>
        <p className="font-bold text-amber-900" style={{ textAlign: "center" }}>
          {resultado.status === "carimbado" ? "Carimbado no seu caderno de bordo!" : "Este PAP já está no seu caderno."}
        </p>
        <div className="w-40">
          <CarimboPap carimbo={resultado.carimbo} />
        </div>
        <Link href="/peregrinacao#caderno" className="btn-primary w-full">
          Ver meu caderno de bordo
        </Link>
      </div>
    );
  }

  if (resultado.status === "sem_peregrinacao") {
    return (
      <div className="card flex flex-col items-center gap-2 text-center">
        <p className="font-semibold" style={{ textAlign: "center" }}>
          Inicie sua peregrinação para carimbar
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300" style={{ textAlign: "center" }}>
          O carimbo só entra no caderno de bordo com a peregrinação em andamento. Depois de iniciar, leia o QR code de
          novo.
        </p>
        <Link href="/peregrinacao" className="btn-primary w-full">
          Ir para Minha peregrinação
        </Link>
      </div>
    );
  }

  return (
    <p className="card text-sm text-red-600">Não foi possível carimbar agora. Tente ler o QR code de novo.</p>
  );
}
