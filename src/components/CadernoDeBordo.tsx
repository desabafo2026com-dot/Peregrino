import { BookOpen, QrCode } from "lucide-react";
import CarimboPap, { type DadosCarimbo } from "@/components/CarimboPap";

// Rodada 68 — caderno de bordo: os carimbos dos PAPs por onde o peregrino
// passou (lidos pelo QR code fixado em cada PAP), em ordem de passagem.
export default function CadernoDeBordo({
  carimbos,
  titulo = "Meu caderno de bordo",
  mostrarDica = true,
}: {
  carimbos: DadosCarimbo[];
  titulo?: string;
  mostrarDica?: boolean;
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
          Em cada Ponto de Apoio, aponte a câmera do celular para o QR code do PAP: o carimbo entra aqui com a data e a
          hora da sua passagem.
        </p>
      )}
      {carimbos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-amber-900/30 p-4 text-center text-sm text-amber-950/60" style={{ textAlign: "center" }}>
          Nenhum carimbo ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {carimbos.map((c) => (
            <li key={c.id}>
              <CarimboPap carimbo={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
