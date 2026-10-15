import { BookOpen, QrCode } from "lucide-react";
import CarimboPap, { type DadosCarimbo } from "@/components/CarimboPap";
import ExportarCadernoPdf from "@/components/ExportarCadernoPdf";
import { CarimboChegada, CarimboSaida } from "@/components/CarimbosEspeciais";
import type { CapaCaderno } from "@/lib/caderno-pdf";
import LerQrCodePap from "@/components/LerQrCodePap";

// Rodada 68 — caderno de bordo: os carimbos dos PAPs por onde o peregrino
// passou (lidos pelo QR code fixado em cada PAP), em ordem de passagem.
export default function CadernoDeBordo({
  carimbos,
  titulo = "Meu caderno de bordo",
  mostrarDica = true,
  capa,
  podeLerQr = false,
}: {
  // Rodada 73 — saída e chegada vêm de capa.saida / capa.chegadaIso.
  carimbos: DadosCarimbo[];
  titulo?: string;
  mostrarDica?: boolean;
  // Rodada 71 — dados da capa do PDF; sem eles, não mostra o botão.
  capa?: CapaCaderno;
  // Rodada 73 — botão para ler o QR do PAP pela câmera, dentro do app.
  podeLerQr?: boolean;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-amber-200 p-4 shadow-sm dark:border-amber-900"
      style={{ background: "linear-gradient(180deg, #fbf5e6 0%, #f3e7cc 100%)" }}
    >
      <h2 className="flex items-center gap-2 text-base font-bold text-amber-900">
        <BookOpen size={20} /> {titulo}
        <span className="ml-auto rounded-full bg-amber-900/10 px-2 py-0.5 text-xs font-bold text-amber-900">
          {carimbos.length} carimbo{carimbos.length === 1 ? "" : "s"}
        </span>
      </h2>
      {mostrarDica && (
        <p className="flex items-start gap-2 text-sm text-amber-950/80" style={{ textAlign: "left" }}>
          <QrCode size={18} className="mt-0.5 shrink-0" />
          Em cada Ponto de Apoio, leia o QR code do PAP pelo botão abaixo (ou aponte a câmera do celular): o carimbo
          entra aqui com a data e a hora da sua passagem.
        </p>
      )}
      {podeLerQr && <LerQrCodePap />}
      {carimbos.length === 0 && !capa?.saida ? (
        <p className="rounded-xl border border-dashed border-amber-900/30 p-4 text-center text-sm text-amber-950/60" style={{ textAlign: "center" }}>
          Nenhum carimbo ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {capa?.saida && (
            <li>
              <CarimboSaida cidade={capa.saida.cidade} uf={capa.saida.uf} iso={capa.saida.iso} />
            </li>
          )}
          {carimbos.map((c) => (
            <li key={c.id}>
              <CarimboPap carimbo={c} />
            </li>
          ))}
        </ul>
      )}
      {capa?.chegadaIso && <CarimboChegada iso={capa.chegadaIso} />}
      {capa && (carimbos.length > 0 || capa.saida) && <ExportarCadernoPdf carimbos={carimbos} capa={capa} />}
    </section>
  );
}
