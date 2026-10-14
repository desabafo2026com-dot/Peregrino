import { ShieldAlert } from "lucide-react";

// Rodada 68 — deixa claro que o registro de ocorrências do app é para
// alerta e conhecimento, não substitui o boletim de ocorrência.
export default function AvisoNaoEBoletim() {
  return (
    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <ShieldAlert size={22} className="mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1" style={{ textAlign: "left" }}>
        <p style={{ textAlign: "left" }}>
          <strong>Isto não é um boletim de ocorrência policial.</strong> O registro aqui serve para alertar outros
          peregrinos e dar conhecimento do que acontece na rodovia. Depois da análise da administração, as
          informações podem ser repassadas às autoridades.
        </p>
        <p style={{ textAlign: "left" }}>
          <strong>Se houve crime, procure a Polícia Civil</strong> e registre o boletim de ocorrência (em SP também dá
          para fazer pela Delegacia Eletrônica). Em emergência, ligue <strong>190</strong> (Polícia Militar) ou{" "}
          <strong>191</strong> (PRF).
        </p>
      </div>
    </div>
  );
}
