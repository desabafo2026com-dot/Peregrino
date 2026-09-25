import { createClient } from "@/lib/supabase/server";
import MensagensAdminClient from "./MensagensAdminClient";
import VoltarButton from "@/components/VoltarButton";
import type { MensagemContato } from "@/types/database";

export default async function AdminMensagensPage() {
  const supabase = await createClient();
  const [{ data: mensagens }, { data: perfis }, { data: gerentes }] = await Promise.all([
    supabase.from("mensagens_contato").select("*").order("criado_em", { ascending: false }),
    supabase.from("profiles").select("id, nome_completo, cidade"),
    supabase.from("gerentes_pap").select("id, nome_completo"),
  ]);

  // Uma mensagem pode vir tanto de um peregrino (profiles) quanto de um
  // gerente de PAP (gerentes_pap, sem linha em profiles necessariamente).
  const nomePorUsuario = new Map<string, string>();
  // Cidade de origem (Rodada 33, a pedido do usuário) — só existe para
  // quem tem perfil de peregrino; gerente de PAP não tem esse campo.
  const cidadePorUsuario = new Map<string, string>();
  (perfis ?? []).forEach((p) => {
    nomePorUsuario.set(p.id as string, p.nome_completo as string);
    if (p.cidade) cidadePorUsuario.set(p.id as string, p.cidade as string);
  });
  (gerentes ?? []).forEach((g) => {
    if (!nomePorUsuario.has(g.id as string)) {
      nomePorUsuario.set(g.id as string, `${g.nome_completo} (gerente de PAP)`);
    }
  });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Falar com o desenvolvedor</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Mensagens enviadas por peregrinos e gerentes de PAP pelo perfil.
        Responda por aqui — a resposta aparece de volta na tela de quem
        enviou.
      </p>
      <MensagensAdminClient
        mensagensIniciais={(mensagens ?? []) as MensagemContato[]}
        nomePorUsuario={Object.fromEntries(nomePorUsuario)}
        cidadePorUsuario={Object.fromEntries(cidadePorUsuario)}
      />
    </div>
  );
}
