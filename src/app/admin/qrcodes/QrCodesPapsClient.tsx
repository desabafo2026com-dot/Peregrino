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

async function imagemComoDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
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
      const [{ jsPDF }, QRCode, logo] = await Promise.all([
        import("jspdf"),
        import("qrcode"),
        imagemComoDataUrl("/icons/logo-emblema.png"),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const H = 148.5;
      for (let i = 0; i < escolhidos.length; i++) {
        const p = escolhidos[i];
        const metade = i % 2;
        if (i > 0 && metade === 0) pdf.addPage();
        const y0 = metade * H;
        const url = `${window.location.origin}/carimbo/${p.token}`;
        const qr = await QRCode.toDataURL(url, { width: 900, margin: 1, color: { dark: "#1f3b6b" } });

        // faixa laranja no topo
        pdf.setFillColor(224, 137, 43);
        pdf.rect(0, y0, W, 6, "F");
        // linha de corte entre as duas metades
        if (metade === 0) {
          pdf.setDrawColor(170);
          pdf.setLineDashPattern([2, 2], 0);
          pdf.line(0, H, W, H);
          pdf.setLineDashPattern([], 0);
        }

        // coluna da esquerda: logo, títulos e instruções
        pdf.addImage(logo, "PNG", 14, y0 + 14, 26, 26);
        pdf.setTextColor(31, 59, 107);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text("O PEREGRINO", 44, y0 + 24);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Ponto de Apoio ao Peregrino", 44, y0 + 30);

        pdf.setTextColor(30, 30, 30);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        let nome = pdf.splitTextToSize(p.nome ?? "PAP", 92) as string[];
        const nomeLongo = nome.length > 2;
        if (nomeLongo) {
          pdf.setFontSize(15);
          nome = pdf.splitTextToSize(p.nome ?? "PAP", 92) as string[];
        }
        pdf.text(nome.slice(0, 3), 14, y0 + 54);
        const yLocal = y0 + 56 + Math.min(nome.length, 3) * (nomeLongo ? 6.5 : 8.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(80);
        pdf.text(pdf.splitTextToSize(localPap(p), 92) as string[], 14, yLocal);

        pdf.setTextColor(184, 98, 26);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("Peregrino, aponte a câmera do celular:", 14, y0 + 104);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(50);
        pdf.setFontSize(10.5);
        pdf.text(
          pdf.splitTextToSize(
            "veja as informações deste PAP e carimbe o seu caderno de bordo no app O Peregrino, com a data e a hora da sua passagem.",
            92
          ) as string[],
          14,
          y0 + 111
        );

        // QR code à direita
        pdf.addImage(qr, "PNG", 112, y0 + 22, 86, 86);
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(`Código ${p.token}`, 155, y0 + 116, { align: "center" });
        pdf.setFontSize(8);
        pdf.text(`${window.location.host} · app gratuito`, 155, y0 + 121, { align: "center" });
      }
      pdf.save(escolhidos.length === 1 ? `qrcode-pap-${escolhidos[0].token}.pdf` : `qrcodes-paps-${escolhidos.length}.pdf`);
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
