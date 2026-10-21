import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Rodada 78 — arquivos estáticos (dados, artes, fontes, ícones) não
    // passam pela checagem de login: cada passagem consultava o Supabase.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|dados/|arte/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|woff2?|txt|xml|pdf|mp4)$).*)",
  ],
};
