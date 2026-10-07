import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VoltarButton from "@/components/VoltarButton";
import OtimizarFotosClient, { type FotoParaOtimizar } from "./OtimizarFotosClient";

// Rodada 61 — reduz as fotos já cadastradas (PAPs, locais de risco, hotéis
// e restaurantes) que foram enviadas no tamanho original do celular. São
// elas que mais gastavam a cota de tráfego do plano grátis do Supabase.
export default async function OtimizarFotosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/otimizar-fotos");
  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!perfil?.is_admin) redirect("/admin");

  const [{ data: paps }, { data: riscos }, { data: comercios }] = await Promise.all([
    supabase.from("pontos_apoio").select("id, nome, foto_url").not("foto_url", "is", null),
    supabase.from("pontos_risco").select("id, titulo, foto_url").not("foto_url", "is", null),
    supabase.from("pontos_comerciais").select("id, nome, foto_url").not("foto_url", "is", null),
  ]);

  const fotos: FotoParaOtimizar[] = [
    ...(paps ?? []).map((p) => ({
      tabela: "pontos_apoio" as const,
      bucket: "pap-fotos",
      id: p.id as string,
      nome: `PAP: ${p.nome as string}`,
      url: p.foto_url as string,
    })),
    ...(riscos ?? []).map((r) => ({
      tabela: "pontos_risco" as const,
      bucket: "risco-fotos",
      id: r.id as string,
      nome: `Risco: ${r.titulo as string}`,
      url: r.foto_url as string,
    })),
    ...(comercios ?? []).map((c) => ({
      tabela: "pontos_comerciais" as const,
      bucket: "comercios-fotos",
      id: c.id as string,
      nome: `Hotel/restaurante: ${c.nome as string}`,
      url: c.foto_url as string,
    })),
  ].filter((f) => f.url.includes("/storage/v1/object/public/"));

  return (
    <div>
      <VoltarButton href="/admin" />
      <h2 className="mb-1 text-xl font-bold">Otimizar fotos</h2>
      <p className="mb-6 text-sm text-neutral-500">
        Reduz as fotos já cadastradas que foram enviadas no tamanho original do celular (algumas com 3–4 MB). Elas
        ficam com cerca de 200 KB, sem diferença visível na tela, e o app passa a gastar bem menos da cota de tráfego
        do Supabase. As fotos novas já são reduzidas sozinhas no envio.
      </p>
      <OtimizarFotosClient userId={user.id} fotos={fotos} />
    </div>
  );
}
