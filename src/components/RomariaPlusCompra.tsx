"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROMARIA_PLUS_VALOR_CENTAVOS } from "@/lib/constants";
import { Sparkles } from "lucide-react";
import type { CompraRomariaPlus } from "@/types/database";

interface Props {
  certificadoId: string;
  // Última compra conhecida para este certificado (qualquer status), se
  // houver — vem do servidor, já filtrada pelo dono via RLS.
  compraInicial: CompraRomariaPlus | null;
}

const VALOR_LABEL = `R$ ${(ROMARIA_PLUS_VALOR_CENTAVOS / 100).toFixed(2).replace(".", ",")}`;

export default function RomariaPlusCompra({ certificadoId, compraInicial }: Props) {
  const router = useRouter();
  const [compra, setCompra] = useState(compraInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);

  const pendente = compra?.status === "pendente";

  // Enquanto o pagamento estiver pendente (ex.: acabou de voltar do
  // Mercado Pago), consulta o status a cada poucos segundos — a confirmação
  // real só chega quando o webhook (do lado do servidor) processa o
  // pagamento, então aqui só ficamos de olho no que já está gravado.
  useEffect(() => {
    if (!pendente || !compra) return;
    if (tentativas >= 15) return;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("compras_romaria_plus")
        .select("*")
        .eq("id", compra.id)
        .maybeSingle();
      if (data) {
        setCompra(data as CompraRomariaPlus);
        if ((data as CompraRomariaPlus).status === "pago") {
          router.refresh();
          return;
        }
      }
      setTentativas((t) => t + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [pendente, tentativas, compra, router]);

  async function comprar() {
    setErro(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/mercadopago/criar-preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificadoId }),
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

  if (pendente) {
    return (
      <div className="card border-amber-200 text-center dark:border-amber-900">
        <p className="mb-1 font-semibold text-amber-800 dark:text-amber-500">
          Confirmando pagamento...
        </p>
        <p className="text-sm text-neutral-500">
          Isso costuma levar só alguns segundos. Se demorar, atualize a
          página em instantes.
        </p>
      </div>
    );
  }

  return (
    <div className="card text-center">
      <Sparkles className="mx-auto mb-2 text-amber-700" size={24} />
      <h3 className="mb-1 font-bold text-amber-800 dark:text-amber-500">Romaria Plus</h3>
      <p className="mb-3 text-sm text-neutral-500">
        Dá direito a um <strong>Certificado Plus</strong> (a versão com a
        arte de pergaminho) e à edição de uma foto sua numa arte
        personalizada, com os dados reais desta peregrinação — pronta para
        compartilhar nas redes.
      </p>
      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}
      <button onClick={comprar} disabled={loading} className="btn-primary">
        {loading ? "Abrindo pagamento..." : `Comprar por ${VALOR_LABEL}`}
      </button>
    </div>
  );
}
