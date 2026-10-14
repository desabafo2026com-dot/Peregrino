import { ShieldAlert } from "lucide-react";

// Rodada 68 — deixa claro que o registro de ocorrências do app não
// substitui o boletim de ocorrência. Rodada 71: só a frase principal.
export default function AvisoNaoEBoletim() {
  return (
    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <ShieldAlert size={22} className="mt-0.5 shrink-0" />
      <p style={{ textAlign: "left" }}>
        <strong>Isto não é um boletim de ocorrência policial.</strong>
      </p>
    </div>
  );
}
