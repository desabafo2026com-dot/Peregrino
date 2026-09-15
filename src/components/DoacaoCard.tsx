"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HeartHandshake, CheckCircle2 } from "lucide-react";
import { DOACAO_VALOR_MINIMO_CENTAVOS, DOACAO_VALOR_MAXIMO_CENTAVOS } from "@/lib/constants";

const SUGESTOES_REAIS = [10, 20, 50];

function paraCentavos(valorTexto: string): number | null {
  const normalizado = valorTexto.replace(/\./g, "").replace(",", ".").trim();
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}

// Doação livre, sem login — qualquer pessoa pode ajudar a manter o app.
// Só o valor é digitado; identidade é opcional (nome, sem exigir e-mail
// nem CPF) e não afeta o pagamento em si.
export default function DoacaoCard() {
  const router = useRouter();
  const params = useSearchParams();
  const [valor, setValor] = useState("20");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Estado inicial já lido direto da URL (em vez de setState num efeito, que
  // causaria uma renderização em cascata) — o efeito abaixo só limpa a URL.
  const [retorno] = useState(() => params.get("doacao") === "retorno");

  useEffect(() => {
    if (params.get("doacao") === "retorno") {
      // Limpa o parâmetro da URL sem recarregar a página.
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doar() {
    setErro(null);
    const valorCentavos = paraCentavos(valor);
    if (
      valorCentavos == null ||
      valorCentavos < DOACAO_VALOR_MINIMO_CENTAVOS ||
      valorCentavos > DOACAO_VALOR_MAXIMO_CENTAVOS
    ) {
      setErro(
        `Informe um valor entre R$ ${(DOACAO_VALOR_MINIMO_CENTAVOS / 100).toFixed(2).replace(".", ",")} e R$ ${(DOACAO_VALOR_MAXIMO_CENTAVOS / 100).toFixed(2).replace(".", ",")}.`
      );
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/mercadopago/criar-preferencia-doacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorCentavos, nome: nome || undefined }),
      });
      const dados = await resp.json();
      if (!resp.ok) {
        setErro(dados.erro ?? "Não foi possível iniciar a doação.");
        setLoading(false);
        return;
      }
      window.location.href = dados.initPoint;
    } catch {
      setErro("Não foi possível falar com o servidor de pagamento.");
      setLoading(false);
    }
  }

  if (retorno) {
    return (
      <div className="card flex flex-col items-center gap-2 border-green-200 bg-green-50 text-center dark:border-green-900 dark:bg-green-950/30">
        <CheckCircle2 className="text-green-600" size={28} />
        <h3 className="font-bold text-green-800 dark:text-green-400">Muito obrigado!</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Assim que o Mercado Pago confirmar o pagamento, sua doação é registrada. Cada
          contribuição ajuda a manter e melhorar o app.
        </p>
      </div>
    );
  }

  return (
    <div className="card text-center">
      <HeartHandshake className="mx-auto mb-2 text-amber-700" size={26} />
      <h3 className="mb-1 font-bold text-amber-800 dark:text-amber-500">
        Ajude o desenvolvedor a manter e melhorar o app
      </h3>
      <p className="mb-4 text-sm text-neutral-500">
        Este app é mantido de forma independente. Se ele ajudou na sua caminhada, considere
        contribuir com qualquer valor.
      </p>
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {SUGESTOES_REAIS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValor(String(v))}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              valor === String(v)
                ? "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
          >
            R$ {v}
          </button>
        ))}
      </div>
      <div className="mx-auto mb-3 flex max-w-xs items-center gap-2">
        <span className="text-sm font-medium text-neutral-500">R$</span>
        <input
          className="input text-center"
          inputMode="decimal"
          placeholder="Outro valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <div className="mx-auto mb-3 max-w-xs">
        <input
          className="input text-center"
          placeholder="Seu nome (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={80}
        />
      </div>
      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}
      <button onClick={doar} disabled={loading} className="btn-primary">
        {loading ? "Abrindo pagamento..." : "Doar pelo Mercado Pago"}
      </button>
    </div>
  );
}
