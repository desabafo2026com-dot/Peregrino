import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapClient from "./MapClient";
import VoltarButton from "@/components/VoltarButton";
import { MapPinPlus } from "lucide-react";
import { kmPertenceARota } from "@/lib/constants";
import type { PontoApoio, Rota, PontoCheckin, PapPreCadastro } from "@/types/database";
import type { PapPreCadastroMapa } from "@/components/MapView";

function normalizarCidade(cidade: string) {
  return cidade
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Pequeno desvio determinístico (sempre o mesmo para o mesmo PAP, calculado
// a partir do próprio id) — usado só como último recurso, para os raros
// pré-cadastros sem km real (itinerantes) ou sem nenhuma âncora de km na
// rota, e como uma separação mínima entre PAPs que caem exatamente no
// mesmo km/cidade. Bem menor que o desvio da Rodada 14 (~350m): agora a
// posição principal vem do km real da rodovia, não mais de "perto da
// cidade" — este desvio é só para não empilhar dois marcadores idênticos.
function comDesvioDeterministico(id: string, lat: number, lng: number, raioGraus: number) {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < id.length; i++) {
    h1 = (h1 * 31 + id.charCodeAt(i)) | 0;
    h2 = (h2 * 131 + id.charCodeAt(i)) | 0;
  }
  const dLat = ((Math.abs(h1) % 2000) / 1000 - 1) * raioGraus;
  const dLng = ((Math.abs(h2) % 2000) / 1000 - 1) * raioGraus;
  return { lat: lat + dLat, lng: lng + dLng };
}

// Mediana do km real (rodovia) de cada cidade, calculada a partir de toda a
// base de pré-cadastro (não só os ainda não vinculados) — quanto mais PAPs
// uma cidade tiver na lista oficial, mais confiável a estimativa. Serve de
// "âncora" para interpolar a posição de qualquer PAP pelo seu próprio km,
// já que a coluna km da tabela usa a quilometragem real da rodovia (ver
// nota abaixo sobre por que não dá pra usar pontos_checkin.km_aproximado
// diretamente).
function medianaKmPorCidade(paps: { cidade: string | null; km: number | null }[]) {
  const porCidade = new Map<string, number[]>();
  for (const p of paps) {
    if (!p.cidade || p.km == null) continue;
    const chave = normalizarCidade(p.cidade);
    const lista = porCidade.get(chave) ?? [];
    lista.push(p.km);
    porCidade.set(chave, lista);
  }
  const resultado = new Map<string, number>();
  for (const [cidade, valores] of porCidade) {
    valores.sort((a, b) => a - b);
    const meio = Math.floor(valores.length / 2);
    resultado.set(cidade, valores.length % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2);
  }
  return resultado;
}

interface Ancora {
  kmReal: number;
  lat: number;
  lng: number;
}

// pontos_checkin.km_aproximado é a distância percorrida desde o início da
// rota (0 a ~170/45) — uma escala totalmente diferente do km real da
// rodovia usado em paps_pre_cadastro.km (ex.: Guarulhos = km ~216). As duas
// não são diretamente conversíveis por fórmula. Em vez disso, usamos cada
// ponto de check-in cuja cidade também aparece na base de PAP como uma
// "âncora" (km real conhecido + posição geográfica exata do check-in) e
// interpolamos linearmente entre as âncoras mais próximas do km pedido —
// preciso o bastante para posicionar sobre o traçado real da rodovia, sem
// inventar uma fórmula de conversão que os dados não sustentam.
function construirAncoras(checkins: PontoCheckin[], kmPorCidade: Map<string, number>): Ancora[] {
  const ancoras: Ancora[] = [];
  for (const c of checkins) {
    const kmReal = kmPorCidade.get(normalizarCidade(c.cidade));
    if (kmReal == null) continue;
    ancoras.push({ kmReal, lat: c.latitude, lng: c.longitude });
  }
  return ancoras.sort((a, b) => a.kmReal - b.kmReal);
}

function posicaoPorKmReal(kmReal: number, ancoras: Ancora[]): { lat: number; lng: number } | null {
  if (ancoras.length === 0) return null;
  if (kmReal <= ancoras[0].kmReal) return { lat: ancoras[0].lat, lng: ancoras[0].lng };
  const ultima = ancoras[ancoras.length - 1];
  if (kmReal >= ultima.kmReal) return { lat: ultima.lat, lng: ultima.lng };
  for (let i = 0; i < ancoras.length - 1; i++) {
    const a = ancoras[i];
    const b = ancoras[i + 1];
    if (kmReal >= a.kmReal && kmReal <= b.kmReal) {
      const t = (kmReal - a.kmReal) / (b.kmReal - a.kmReal || 1);
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
  }
  return null;
}

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
      .from("pontos_apoio")
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

  // Posição de cada PAP ainda sem gerente vinculado, em ordem de
  // preferência: (1) posição exata marcada pela administração (arrastando
  // no mapa ou pela tela de reposicionar); (2) estimativa pelo km real da
  // rodovia, interpolando entre os pontos de check-in mais próximos daquele
  // km (ver construirAncoras/posicaoPorKmReal); (3) só quando não há km
  // cadastrado (PAP itinerante) nem âncora suficiente na rota, a
  // aproximação antiga pela cidade do check-in, com um desvio pequeno para
  // não empilhar marcadores idênticos.
  const kmPorCidade = medianaKmPorCidade((todosPapsPreCadastro ?? []) as { cidade: string | null; km: number | null }[]);
  const checkinsPorRota = new Map<string, PontoCheckin[]>();
  for (const r of (rotas ?? []) as Rota[]) {
    checkinsPorRota.set(
      r.slug,
      ((pontosCheckin ?? []) as PontoCheckin[]).filter((c) => c.rota_id === r.id)
    );
  }
  const ancorasPorRota = new Map<string, Ancora[]>();
  for (const [slug, checkins] of checkinsPorRota) {
    ancorasPorRota.set(slug, construirAncoras(checkins, kmPorCidade));
  }

  const cidadeParaCoord = new Map<string, { lat: number; lng: number }>();
  for (const p of (pontosCheckin ?? []) as PontoCheckin[]) {
    const chave = normalizarCidade(p.cidade);
    if (!cidadeParaCoord.has(chave)) {
      cidadeParaCoord.set(chave, { lat: p.latitude, lng: p.longitude });
    }
  }

  const papsPreCadastro: PapPreCadastroMapa[] = [];
  for (const p of (papsPreCadastroData ?? []) as PapPreCadastro[]) {
    let coord: { lat: number; lng: number } | undefined;
    let precisao: "exata" | "km" | "cidade" | undefined;

    if (p.latitude != null && p.longitude != null) {
      coord = { lat: p.latitude, lng: p.longitude };
      precisao = "exata";
    } else if (p.km != null) {
      const rotaSlug = kmPertenceARota(p.km, "norte") ? "norte" : "sul";
      const posicao = posicaoPorKmReal(p.km, ancorasPorRota.get(rotaSlug) ?? []);
      if (posicao) {
        coord = posicao;
        precisao = "km";
      }
    }
    if (!coord) {
      const cidadeCoord = p.cidade ? cidadeParaCoord.get(normalizarCidade(p.cidade)) : undefined;
      if (cidadeCoord) {
        coord = cidadeCoord;
        precisao = "cidade";
      }
    }
    if (!coord) continue;

    // Só afasta visualmente quando a posição não é exata — um pequeno
    // desvio (bem menor quando já viemos do km real, que já situa o ponto
    // sobre a rodovia) evita que dois PAPs no mesmo km/cidade fiquem
    // empilhados num marcador só.
    const posicaoFinal =
      precisao === "exata" ? coord : comDesvioDeterministico(p.id, coord.lat, coord.lng, precisao === "km" ? 0.0006 : 0.0032);

    papsPreCadastro.push({
      id: p.id,
      nome: p.nome,
      cidade: p.cidade ?? "",
      br: p.br,
      km: p.km,
      sentido_pista: p.sentido_pista,
      lat: posicaoFinal.lat,
      lng: posicaoFinal.lng,
      datas_funcionamento: p.datas_funcionamento,
    });
  }

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
