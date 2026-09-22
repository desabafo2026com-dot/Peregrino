import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import RomariaPlusAdminClient, { type CompraComCertificado } from "./RomariaPlusAdminClient";

export default async function AdminRomariaPlusPage() {
  const supabase = await createClient();

  // RLS (compras_romaria_plus_select_admin, migration 21) já garante que só
  // administrador chega até aqui com dados de verdade. tipo="inicial"
  // (Rodada 30): a lista principal continua sendo "quem comprou o
  // Certificado Plus" — pacotes extra de fotos aparecem só como contagem
  // (ver pacotesExtraPorCompra abaixo), não como cards à parte.
  const { data } = await supabase
    .from("compras_romaria_plus")
    .select("*, certificados(nome_peregrino, codigo)")
    .eq("status", "pago")
    .eq("tipo", "inicial")
    .order("pago_em", { ascending: false });

  const compras = (data ?? []) as CompraComCertificado[];

  // Só a contagem de fotos por compra (romaria_plus_fotos_select_admin,
  // migration 24) — a pedido do usuário, a administração não vê a imagem
  // de ninguém, só o registro de quantas fotos cada um já criou.
  const idsCompras = compras.map((c) => c.id);
  const { data: fotos } = idsCompras.length
    ? await supabase.from("romaria_plus_fotos").select("compra_id").in("compra_id", idsCompras)
    : { data: [] as { compra_id: string }[] | null };
  const contagemPorCompra = new Map<string, number>();
  (fotos ?? []).forEach((f) => {
    contagemPorCompra.set(f.compra_id as string, (contagemPorCompra.get(f.compra_id as string) ?? 0) + 1);
  });

  // Pacotes extra de +5 fotos pagos (Rodada 30), por compra inicial — muda
  // o "de quantas" no card (5, 10, 15...) e mostra quantos pacotes extra
  // cada peregrino já comprou.
  const { data: extras } = idsCompras.length
    ? await supabase
        .from("compras_romaria_plus")
        .select("compra_pai_id")
        .in("compra_pai_id", idsCompras)
        .eq("tipo", "extra")
        .eq("status", "pago")
    : { data: [] as { compra_pai_id: string }[] | null };
  const pacotesExtraPorCompra = new Map<string, number>();
  (extras ?? []).forEach((e) => {
    const id = e.compra_pai_id as string;
    pacotesExtraPorCompra.set(id, (pacotesExtraPorCompra.get(id) ?? 0) + 1);
  });

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Romaria Plus — compras</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Registro de quem adquiriu o Certificado Plus + arte de 5 fotos: data da compra e quantas
        fotos cada um já criou. Por privacidade, a administração não tem acesso às fotos em si.
      </p>
      <RomariaPlusAdminClient
        comprasIniciais={compras.map((c) => ({
          ...c,
          quantidadeFotos: contagemPorCompra.get(c.id) ?? 0,
          pacotesExtra: pacotesExtraPorCompra.get(c.id) ?? 0,
        }))}
      />
    </div>
  );
}
