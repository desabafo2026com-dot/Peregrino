import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapClient from "./MapClient";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus } from "lucide-react";
import { posicionarPapsPreCadastro } from "@/lib/pap-pre-cadastro-mapa";
import type { PontoApoio, Rota, PontoCheckin, PapPreCadastro } from "@/types/database";
import type { PapPreCadastroMapa } from "@/components/MapView";

export default async function MapaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!perfil?.is_admin;
  }

  const [
    { data: pontosApoio },
    { data: rotas },
    { data: pontosCheckin },
    { data: papsPreCadastroData },
    { data: todosPapsPreCadastro },
  ] = await Promise.all([
    supabase
      // Rodada 59 — view pública (telefone/responsável só se autorizados).
      .from("pontos_apoio_publico")
      .select("*")
      .eq("status_aprovacao", "aprovado"),
    // rotas/pontosCheckin não desenham mais linha nenhuma nesta página desde
    // a Rodada 20 (só PAP aparece aqui) — continuam sendo buscados só porque
    // o algoritmo de posição por km real do PAP pré-cadastro, abaixo,
    // precisa deles como âncora geográfica.
    supabase.from("rotas").select("*").order("ordem"),
    supabase.from("pontos_checkin").select("*").order("ordem"),
    // Só os ainda não vinculados a um gerente — assim que alguém vincula, o
    // ponto sai daqui e passa a ser representado pelo PAP real (pontos_apoio,
    // já com localização exata) quando a divulgação for aprovada.
    supabase.from("paps_pre_cadastro").select("*").is("reivindicado_por", null),
    // Base inteira (vinculados ou não) só para estimar o km real médio de
    // cada cidade — quanto mais PAPs conhecidos numa cidade, mais confiável
    // a âncora usada na interpolação abaixo.
    supabase.from("paps_pre_cadastro").select("cidade, km"),
  ]);

  // Posição de cada PAP ainda sem gerente vinculado — lógica em
  // src/lib/pap-pre-cadastro-mapa.ts (Rodada 44, compartilhada com o mapa
  // do painel do admin).
  const papsPreCadastro: PapPreCadastroMapa[] = posicionarPapsPreCadastro({
    paps: (papsPreCadastroData ?? []) as PapPreCadastro[],
    baseCidadeKm: (todosPapsPreCadastro ?? []) as { cidade: string | null; km: number | null }[],
    rotas: (rotas ?? []) as Rota[],
    pontosCheckin: (pontosCheckin ?? []) as PontoCheckin[],
  });

  return (
    <div>
      <VoltarButton href="/" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pontos de Apoio ao Peregrino</h1>
          <p className="text-sm text-neutral-500">
            PAP — Pontos de Apoio ao Peregrino: tenda verde = confirmado pela
            administração; tenda cinza tracejada = aguardando vínculo de um
            gerente, localização estimada pelo km da rodovia. Toque num
            marcador para ver os detalhes daquele ponto.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/pap/novo"
            className="btn-primary flex items-center gap-1 whitespace-nowrap"
          >
            <MapPinPlus size={18} /> Cadastrar PAP
          </Link>
        )}
      </div>

      <MapClient
        pontosApoio={(pontosApoio ?? []) as PontoApoio[]}
        papsPreCadastro={papsPreCadastro}
        isAdmin={isAdmin}
      />

      {user && !isAdmin && (
        <p className="mt-2 text-sm text-neutral-500">
          Novos PAP são cadastrados por gerentes de PAP aprovados ou pela
          equipe administrativa.{" "}
          <Link href="/gerente-pap/cadastro" className="font-semibold text-amber-700 dark:text-amber-500">
            Quer cadastrar o seu?
          </Link>
        </p>
      )}
    </div>
  );
}
