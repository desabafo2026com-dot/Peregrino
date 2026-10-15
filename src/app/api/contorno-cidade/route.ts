import { NextResponse, type NextRequest } from "next/server";
import { contornoDaCidade } from "@/lib/contorno-cidade";

// Rodada 73 — contorno da cidade (IBGE) em SVG para o carimbo de saída do
// caderno de bordo. Resposta em cache de CDN por 30 dias.
export async function GET(request: NextRequest) {
  const cidade = (request.nextUrl.searchParams.get("cidade") ?? "").slice(0, 80);
  const uf = (request.nextUrl.searchParams.get("uf") ?? "").slice(0, 2).toUpperCase() || null;
  if (!cidade.trim()) return NextResponse.json({ caminho: null }, { status: 400 });
  const r = await contornoDaCidade(cidade, uf);
  return NextResponse.json(r ?? { caminho: null }, {
    headers: { "Cache-Control": r ? "public, s-maxage=2592000, stale-while-revalidate=86400" : "public, s-maxage=3600" },
  });
}
