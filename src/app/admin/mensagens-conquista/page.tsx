import { createClient } from "@/lib/supabase/server";
import MensagensConquistaAdminClient from "./MensagensConquistaAdminClient";
import VoltarButton from "@/components/VoltarButton";
import type { MensagemConquista } from "@/types/database";

// Moderação das mensagens públicas de conquista (Rodada 27) — rede de
// segurança simples: a mensagem entra no ar assim que o peregrino publica
// (sem revisão prévia), e o administrador consegue ocultar (ou reativar)
// qualquer uma daqui, caso apareça algo inadequado. Nada é apagado de
// verdade por padrão — "ativo=false" só tira do carrossel da home.
export default async function AdminMensagensConquistaPage() {
  const supabase = await createClient();
  const { data: mensagens } = await supabase
    .from("mensagens_conquista")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Mensagens de conquista</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Mensagens públicas que peregrinos deixam ao concluir a peregrinação, mostradas uma a uma na
        página inicial. Publicam na hora, sem revisão prévia — oculte aqui qualquer uma que for
        inadequada (o registro não é apagado, só some do carrossel).
      </p>
      <MensagensConquistaAdminClient mensagensIniciais={(mensagens ?? []) as MensagemConquista[]} />
    </div>
  );
}
