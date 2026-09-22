"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROMARIA_PLUS_EXTRA_FOTOS_VALOR_CENTAVOS, ROMARIA_PLUS_FOTOS_POR_PACOTE } from "@/lib/constants";
import { ImagePlus } from "lucide-react";
import type { CompraRomariaPlus } from "@/types/database";

interface Props {
  // Compra "inicial" (Certificado Plus) já paga, dona da galeria de fotos.
  compraId: string;
  // Pacote extra mais recente ainda pendente (voltando do Mercado Pago),
  // se houver — mesmo padrão de espera/confirmação de RomariaPlusCompra.
  pacoteExtraPendenteInicial: CompraRomariaPlus | null;
}

const VALOR_LABEL = `R$ ${(ROMARIA_PLUS_EXTRA_FOTOS_VALOR_CENTAVOS / 100).toFixed(2).replace(".", ",")}`;

// Botão de compra do pacote extra de +5 fotos (Rodada 30, a pedido do
// usuário) — só é renderizado pelo componente pai (RomariaPlusFotos) quando
// a galeria atual já está completa. Reaproveita o mesmo padrão de espera de
// pagamento de RomariaPlusCompra (poll a cada poucos segundos até o webhook
// confirmar, com um limite de tentativas para não ficar preso para sempre).
export default function RomariaPlusComprarExtra({ compraId, pacoteExtraPendenteInicial }: Props) {
  const router = useRouter();
  const [pendente, setPendente] = useState(pacoteExtraPendenteInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [montadoEm] = useState(() => Date.now());

  const RECENTE_MS = 10 * 60 * 1000;
  const pendenteRecente =
    !!pendente && montadoEm - new Date(pendente.criado_em).getTime() < RECENTE_MS;

  useEffect(() => {
    if (!pendenteRecente || !pendente) return;
    if (tentativas >= 20) return;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("compras_romaria_plus")
        .select("*")
        .eq("id", pendente.id)
        .maybeSingle();
      if (data) {
        const atualizada = data as CompraRomariaPlus;
        if (atualizada.status === "pago") {
          router.refresh();
          return;
        }
        if (atualizada.status !== "pendente") {
          setPendente(null);
          return;
        }
      }
      setTentativas((t) => t + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [pendenteRecente, pendente, tentativas, router]);

  async function comprar() {
    setErro(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/mercadopago/criar-preferencia-extra-fotos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compraId }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.erro ?? "Não foi possível iniciar o pagamento.");
        setLoading(false);
        return;
      }
      window.location.href = dados.initPoint;
    } catch {
      setErro("Não foi possível falar com o servidor de pagamento.");
      setLoading(false);
    }
  }

  if (pendenteRecente) {
    return (
      <div className="card border-amber-200 text-center dark:border-amber-900">
        <p className="mb-1 font-semibold text-amber-800 dark:text-amber-500">Confirmando pagamento...</p>
        <p className="text-sm text-neutral-500">
          Isso costuma levar só alguns segundos. Se demorar, atualize a página em instantes.
        </p>
      </div>
    );
  }

  return (
    <div className="card border-dashed text-center">
      <ImagePlus className="mx-auto mb-2 text-amber-700" size={22} />
      <h3 className="mb-1 font-bold text-amber-800 dark:text-amber-500">
        Quer criar mais fotos?
      </h3>
      <p className="mb-3 text-sm text-neutral-500">
        Você já usou todas as fotos deste pacote. Compre mais{" "}
        <strong>{ROMARIA_PLUS_FOTOS_POR_PACOTE} fotos</strong> para continuar criando artes desta
        peregrinação.
      </p>
      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}
      <button
        onClick={comprar}
        disabled={loading}
        className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-800 px-6 py-4 text-white shadow-md transition hover:from-amber-700 hover:to-amber-900 disabled:opacity-60 dark:from-amber-700 dark:to-amber-900"
      >
        {loading ? (
          <span className="py-1 text-base font-bold">Abrindo pagamento...</span>
        ) : (
          <>
            <span className="text-2xl leading-tight font-black tracking-tight">{VALOR_LABEL}</span>
            <span className="text-sm font-semibold text-amber-50">+{ROMARIA_PLUS_FOTOS_POR_PACOTE} fotos</span>
          </>
        )}
      </button>
    </div>
  );
}
