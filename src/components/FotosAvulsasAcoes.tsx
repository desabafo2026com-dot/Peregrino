"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROMARIA_PLUS_VALOR_CENTAVOS } from "@/lib/constants";

// Rodada 62b — artes sem peregrinação registrada no app: a 1ª grátis (de
// qualquer ano, uma por conta) e a Romaria Plus avulsa (5 artes, sem
// Certificado Plus).

const VALOR_LABEL = `R$ ${(ROMARIA_PLUS_VALOR_CENTAVOS / 100).toFixed(2).replace(".", ",")}`;

function anos(): number[] {
  const atual = new Date().getFullYear();
  return Array.from({ length: atual - 1950 + 1 }, (_, i) => atual - i);
}

function SeletorAno({ valor, onMudar, id }: { valor: number; onMudar: (n: number) => void; id: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <label htmlFor={id} className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
        Ano da peregrinação:
      </label>
      <select
        id={id}
        className="input"
        style={{ width: "7rem" }}
        value={valor}
        onChange={(e) => onMudar(Number(e.target.value))}
      >
        {anos().map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ArteGratisAvulsa() {
  const router = useRouter();
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    setErro(null);
    setOcupado(true);
    const { data, error } = await createClient().rpc("liberar_arte_gratis_avulsa", { p_ano: ano });
    if (error || !data) {
      setOcupado(false);
      setErro(
        error?.message.includes("arte_gratis_ja_usada")
          ? "Sua arte grátis já foi usada numa peregrinação."
          : "Não foi possível liberar agora. Tente novamente."
      );
      return;
    }
    router.push(`/fotos/${data as string}`);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <SeletorAno valor={ano} onMudar={setAno} id="ano-arte-gratis" />
      <button
        type="button"
        onClick={criar}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-500 bg-amber-50 px-4 py-3 font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <Gift size={20} /> {ocupado ? "Abrindo..." : "Criar minha primeira arte grátis"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}

export function ComprarPlusAvulso({ anoFixo }: { anoFixo?: number }) {
  const [ano, setAno] = useState(() => anoFixo ?? new Date().getFullYear());
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function comprar() {
    setErro(null);
    setOcupado(true);
    try {
      const resp = await fetch("/api/mercadopago/criar-preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.erro ?? "Não foi possível iniciar o pagamento.");
        setOcupado(false);
        return;
      }
      window.location.href = dados.initPoint;
    } catch {
      setErro("Não foi possível falar com o servidor de pagamento.");
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {anoFixo == null && <SeletorAno valor={ano} onMudar={setAno} id="ano-plus-avulso" />}
      <button
        type="button"
        onClick={comprar}
        disabled={ocupado}
        className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-800 px-6 py-4 text-white shadow-md transition hover:from-amber-700 hover:to-amber-900 disabled:opacity-60"
      >
        {ocupado ? (
          <span className="py-1 text-base font-bold">Abrindo pagamento...</span>
        ) : (
          <>
            <span className="flex items-center gap-2 text-3xl leading-tight font-black tracking-tight">
              <Sparkles size={22} /> {VALOR_LABEL}
            </span>
            <span className="text-sm font-semibold text-amber-50">+5 artes com suas fotos ({ano})</span>
          </>
        )}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}

// Voltando do Mercado Pago: espera a confirmação do pagamento (o webhook
// grava) e recarrega a página.
export function AguardandoPagamento({ compraId }: { compraId: string }) {
  const router = useRouter();
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    if (tentativas >= 20) return;
    const timer = setTimeout(async () => {
      const { data } = await createClient()
        .from("compras_romaria_plus")
        .select("status")
        .eq("id", compraId)
        .maybeSingle();
      if (data?.status === "pago") {
        router.replace(`/fotos/${compraId}`);
        return;
      }
      setTentativas((t) => t + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [tentativas, compraId, router]);

  return (
    <div className="card border-amber-200 text-center dark:border-amber-900">
      <p className="mb-1 font-semibold text-amber-800 dark:text-amber-500">
        {tentativas >= 20 ? "Pagamento ainda não confirmado" : "Confirmando pagamento..."}
      </p>
      <p className="text-sm text-neutral-500" style={{ textAlign: "center" }}>
        {tentativas >= 20
          ? "Se você concluiu o pagamento, atualize esta página em alguns minutos."
          : "Isso costuma levar só alguns segundos."}
      </p>
    </div>
  );
}
