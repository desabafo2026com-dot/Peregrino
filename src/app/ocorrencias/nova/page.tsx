import { redirect } from "next/navigation";

// Rodada 69 — o formulário passou para /ocorrencias (sem lista pública).
export default function NovaOcorrenciaPage() {
  redirect("/ocorrencias");
}
