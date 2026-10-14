"use client";

import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { BR_LABELS, SENTIDO_PISTA_LABELS } from "@/lib/constants";

export interface QrPap {
  token: string;
  nome: string | null;
  cidade: string | null;
  km: number | null;
  br: string | null;
  sentido_pista: string | null;
  origem: "pap" | "pre";
}

function normalizar(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function localPap(p: QrPap) {
  return [
    p.cidade,
    [p.br ? (BR_LABELS[p.br] ?? p.br) : null, p.km != null ? `km ${p.km}` : null].filter(Boolean).join(" "),
    p.sentido_pista ? SENTIDO_PISTA_LABELS[p.sentido_pista] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function QrCodesPapsClient({ lista }: { lista: QrPap[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "pap" | "pre">("todos");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return lista.filter(
      (p) =>
        (filtro === "todos" || p.origem === filtro) &&
        (!termo || normalizar(`${p.nome ?? ""} ${p.cidade ?? ""} ${p.km ?? ""}`).includes(termo))
    );
  }, [lista, busca, filtro]);

  function alternar(token: string) {
    setMarcados((m) => {
      const novo = new Set(m);
      if (novo.has(token)) novo.delete(token);
      else novo.add(token);
      return novo;
    });
  }

  function marcarTodosFiltrados(marcar: boolean) {
    setMarcados((m) => {
      const novo = new Set(m);
      filtrados.forEach((p) => (marcar ? novo.add(p.token) : novo.delete(p.token)));
      return novo;
    });
  }

  async function gerarPdf() {
    const escolhidos = lista.filter((p) => marcados.has(p.token));
    if (!escolhidos.length) return;
    setGerando(true);
    setErro(null);
    try {
      const { gerarPdfCartazesQr, TEXTO_CARTAZ_PAP } = await import("@/lib/pdf-cartaz-qr");
      await gerarPdfCartazesQr(
        escolhidos.map((p) => ({
          ...TEXTO_CARTAZ_PAP,
          url: `${window.location.origin}/carimbo/${p.token}`,
          nome: p.nome ?? "PAP",
          local: localPap(p),
          codigo: p.token,
        })),
        escolhidos.length === 1 ? `qrcode-pap-${escolhidos[0].token}.pdf` : `qrcodes-paps-${escolhidos.length}.pdf`
      );
    } catch {
      setErro("Não foi possível gerar o PDF agora. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
          <input
            className="input"
            style={{ paddingLeft: "2rem" }}
            placeholder="Buscar por nome, cidade ou km"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
          <option value="todos">Todos ({lista.length})</option>
          <option value="pap">Com gerente ({lista.filter((p) => p.origem === "pap").length})</option>
          <option value="pre">Pré-cadastrados ({lista.filter((p) => p.origem === "pre").length})</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="btn-secondary" onClick={() => marcarTodosFiltrados(true)}>
          Marcar todos da lista ({filtrados.length})
        </button>
        <button type="button" className="btn-secondary" onClick={() => marcarTodosFiltrados(false)}>
          Desmarcar
        </button>
        <button
          type="button"
          className="btn-primary flex items-center gap-2"
          disabled={!marcados.size || gerando}
          onClick={gerarPdf}
        >
          <FileText size={16} /> {gerando ? "Gerando PDF..." : `Gerar PDF (${marcados.size})`}
        </button>
      </div>
      {marcados.size > 0 && (
        <p className="text-xs text-neutral-500">
          {Math.ceil(marcados.size / 2)} folha{Math.ceil(marcados.size / 2) > 1 ? "s" : ""} A4 · corte na linha
          tracejada
        </p>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {filtrados.map((p) => (
          <li key={p.token}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
              <input type="checkbox" checked={marcados.has(p.token)} onChange={() => alternar(p.token)} />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{p.nome ?? "PAP"}</span>
                <span className="block text-xs text-neutral-500">{localPap(p)}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  p.origem === "pap"
                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {p.origem === "pap" ? "com gerente" : "pré-cadastro"}
              </span>
            </label>
          </li>
        ))}
        {filtrados.length === 0 && <li className="px-3 py-4 text-sm text-neutral-500">Nenhum PAP encontrado.</li>}
      </ul>
    </div>
  );
}
