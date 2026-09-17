"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROMARIA_PLUS_VALOR_CENTAVOS } from "@/lib/constants";
import { Sparkles, Ticket, ShieldCheck } from "lucide-react";
import type { CompraRomariaPlus } from "@/types/database";

interface Props {
  certificadoId: string;
  // Última compra conhecida para este certificado (qualquer status), se
  // houver — vem do servidor, já filtrada pelo dono via RLS.
  compraInicial: CompraRomariaPlus | null;
  // Conta logada é administradora — mostra um botão extra para liberar o
  // Certificado Plus do próprio admin sem pagamento nem cupom, só para
  // testar a arte e o editor de foto (Rodada 16).
  isAdmin?: boolean;
}

const VALOR_LABEL = `R$ ${(ROMARIA_PLUS_VALOR_CENTAVOS / 100).toFixed(2).replace(".", ",")}`;

export default function RomariaPlusCompra({ certificadoId, compraInicial, isAdmin = false }: Props) {
  const router = useRouter();
  const [compra, setCompra] = useState(compraInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [cupomAberto, setCupomAberto] = useState(false);
  const [codigoCupom, setCodigoCupom] = useState("");
  const [resgatando, setResgatando] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [liberandoAdmin, setLiberandoAdmin] = useState(false);
  // "Foto" do instante em que este componente foi montado — usada só para
  // decidir se uma compra "pendente" é recente o bastante para valer a
  // pena esperar (ver `pendenteRecente` abaixo). Guardada em estado (com
  // inicializador preguiçoso) em vez de chamar `Date.now()` direto no corpo
  // do componente, que o React trata como impuro durante a renderização.
  const [montadoEm] = useState(() => Date.now());

  // Ignora um status "pendente" travado (ex.: a pessoa desistiu do
  // pagamento no Mercado Pago e voltou, ou fechou a aba) depois de ~1
  // minuto tentando confirmar sem sucesso — sem isso, a tela ficava presa
  // em "Confirmando pagamento..." para sempre, sem voltar para a opção de
  // comprar de novo (bug relatado na Rodada 18).
  const [ignorarPendente, setIgnorarPendente] = useState(false);
  // A correção da Rodada 18 só resolvia isso DENTRO de uma mesma sessão da
  // página: como `ignorarPendente` é um estado local, uma compra "pendente"
  // de dias atrás (pagamento nunca concluído nem retomado) fazia a tela
  // recomeçar a esperar ~1 minuto do zero TODA VEZ que a página era aberta
  // de novo — na prática, para quem só dava uma espiada rápida, "só ficava
  // preso" (bug relatado na Rodada 21). Agora só entra no modo de espera
  // quando a compra pendente é recente (foi criada há pouco, coerente com
  // "acabei de voltar do Mercado Pago") — uma pendente antiga já mostra a
  // tela de compra direto, sem esperar mais nada.
  const RECENTE_MS = 10 * 60 * 1000; // 10 minutos
  const pendenteRecente =
    !!compra && compra.status === "pendente" && montadoEm - new Date(compra.criado_em).getTime() < RECENTE_MS;
  const pendente = pendenteRecente && !ignorarPendente;

  // Enquanto o pagamento estiver pendente (ex.: acabou de voltar do
  // Mercado Pago), consulta o status a cada poucos segundos — a confirmação
  // real só chega quando o webhook (do lado do servidor) processa o
  // pagamento, então aqui só ficamos de olho no que já está gravado. Depois
  // de ~20 tentativas (~1 minuto), desiste de esperar e volta sozinho para
  // a tela de compra.
  useEffect(() => {
    if (!pendente || !compra) return;
    // O setState de desistência acontece dentro do próprio setTimeout (não
    // direto no corpo do efeito) para não disparar um re-render em cascata
    // síncrono durante a fase de efeitos.
    if (tentativas >= 20) {
      const timer = setTimeout(() => setIgnorarPendente(true), 0);
      return () => clearTimeout(timer);
    }
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

  async function resgatarCupom() {
    if (!codigoCupom.trim()) return;
    setErroCupom(null);
    setResgatando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("resgatar_cupom_romaria_plus", {
        p_codigo: codigoCupom.trim(),
        p_certificado_id: certificadoId,
      });
      if (error) {
        setErroCupom(
          error.message.includes("já foi usado")
            ? "Este cupom já foi usado."
            : error.message.includes("inválido")
              ? "Cupom inválido — confira o código e tente de novo."
              : "Não foi possível resgatar o cupom agora. Tente novamente."
        );
        setResgatando(false);
        return;
      }
      router.refresh();
    } catch {
      setErroCupom("Não foi possível falar com o servidor agora.");
      setResgatando(false);
    }
  }

  async function liberarParaAdmin() {
    setErro(null);
    setLiberandoAdmin(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("admin_liberar_romaria_plus_teste", {
        p_certificado_id: certificadoId,
      });
      if (error) {
        setErro("Não foi possível liberar para teste agora.");
        setLiberandoAdmin(false);
        return;
      }
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor agora.");
      setLiberandoAdmin(false);
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
      <h3 className="mb-1 font-bold text-amber-800 dark:text-amber-500">Certificado Plus + arte de 5 fotos</h3>
      <p className="mb-3 text-sm text-neutral-500">
        Dá direito a um <strong>Certificado Plus</strong> (a versão com a
        arte de pergaminho) e à edição de até <strong>5 fotos suas</strong>{" "}
        em artes personalizadas, com os dados reais desta peregrinação —
        prontas para baixar ou compartilhar nas redes, uma de cada vez, no
        seu tempo.
      </p>
      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}
      {/* Rodada 23: a pedido do usuário ("o botão de romaria plus devia ser
          melhor, mais intuitivo e destacado com valor e depois com título
          só") — antes era um botão padrão com uma frase longa e o preço no
          fim, fácil de ler por cima e nem perceber o valor. Agora o valor
          vem primeiro, bem grande, com o título/benefício abaixo em texto
          menor, num botão maior e mais chamativo que o restante da tela. */}
      <button
        onClick={comprar}
        disabled={loading}
        className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-800 px-6 py-4 text-white shadow-md transition hover:from-amber-700 hover:to-amber-900 disabled:opacity-60 dark:from-amber-700 dark:to-amber-900"
      >
        {loading ? (
          <span className="py-1 text-base font-bold">Abrindo pagamento...</span>
        ) : (
          <>
            <span className="text-3xl leading-tight font-black tracking-tight">{VALOR_LABEL}</span>
            <span className="text-sm font-semibold text-amber-50">
              Certificado Plus + arte de 5 fotos
            </span>
          </>
        )}
      </button>

      {cupomAberto ? (
        <div className="mt-4 flex flex-col items-stretch gap-2 border-t border-dashed border-amber-200 pt-4 dark:border-amber-900">
          <label htmlFor={`cupom-${certificadoId}`} className="text-xs font-medium text-neutral-500">
            Código do cupom
          </label>
          <input
            id={`cupom-${certificadoId}`}
            value={codigoCupom}
            onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
            placeholder="Ex.: PEREGR2026"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-center font-mono uppercase tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
          />
          {erroCupom && <p className="text-xs text-red-600">{erroCupom}</p>}
          <button
            onClick={resgatarCupom}
            disabled={resgatando || !codigoCupom.trim()}
            className="btn-secondary"
          >
            {resgatando ? "Resgatando..." : "Resgatar cupom"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCupomAberto(true)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-amber-700 dark:hover:text-amber-500"
        >
          <Ticket size={13} /> Tenho um cupom
        </button>
      )}

      {isAdmin && (
        <button
          onClick={liberarParaAdmin}
          disabled={liberandoAdmin}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-500 hover:border-amber-400 hover:text-amber-700 dark:border-neutral-700 dark:hover:text-amber-500"
        >
          <ShieldCheck size={14} />
          {liberandoAdmin ? "Liberando..." : "Liberar Certificado Plus para testar (admin, sem pagamento)"}
        </button>
      )}
    </div>
  );
}
