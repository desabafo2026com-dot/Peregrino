import { OctagonAlert } from "lucide-react";

// Rodada 46 — "Quadro resumo dos Riscos", texto definido pelo usuário. O
// primeiro item é o recado principal e fica em destaque; os demais são os
// lugares e situações em que o risco aumenta. Componente próprio para
// poder ser reaproveitado em outras telas sem duplicar o texto.
const RISCO_PRINCIPAL = "TODA a Rodovia é um risco constante.";

const RISCOS = [
  "Nos locais de entrada e saída de veículos da rodovia (faixa tracejada, sem acostamento).",
  "Nos viadutos.",
  "Nas pontes.",
  "Nas entradas e saídas de postos e restaurantes.",
  "Nas travessias de faixas.",
  "À noite ou com chuva.",
  "Próximo das faixas e dos veículos.",
];

export default function QuadroResumoRiscos() {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700 dark:text-red-400">
        <OctagonAlert size={20} /> Quadro resumo dos Riscos
      </h2>
      <div className="overflow-hidden rounded-2xl border-2 border-red-300 bg-white dark:border-red-900 dark:bg-neutral-900">
        <p
          className="bg-red-700 px-4 py-3 text-base font-extrabold text-white"
          style={{ textAlign: "left" }}
        >
          {RISCO_PRINCIPAL}
        </p>
        <ul className="flex flex-col gap-2 px-4 py-3 text-sm">
          {RISCOS.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-0.5 font-bold text-red-600 dark:text-red-400" aria-hidden="true">
                !
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
