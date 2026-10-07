"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirDeUrl, CACHE_UM_ANO } from "@/lib/comprimir-imagem";

// Rodada 61 — sem nada na tela: reduz, uma única vez, a foto de perfil e
// as artes da Romaria Plus antigas desta pessoa (enviadas antes de o app
// reduzir as fotos no envio). A foto de perfil aparece no topo de TODAS as
// páginas, então uma foto de 3 MB pesava muito no tráfego do Supabase.
const MARCA = "peregrino:fotos-otimizadas:";

function jaTentou(url: string) {
  try {
    return localStorage.getItem(MARCA + url) === "1";
  } catch {
    return true;
  }
}
function marcar(url: string) {
  try {
    localStorage.setItem(MARCA + url, "1");
  } catch {
    // sem armazenamento — tenta de novo na próxima visita
  }
}

export default function OtimizarMinhasFotos({
  userId,
  avatarUrl,
  artes,
}: {
  userId: string;
  avatarUrl: string | null;
  artes: { compraId: string; indice: number; arteUrl: string }[];
}) {
  useEffect(() => {
    let cancelado = false;
    async function rodar() {
      const supabase = createClient();
      // Foto de perfil antiga: arquivo "foto.ext" (as novas são "foto-<data>.jpg").
      if (avatarUrl && /\/avatars\/[^/]+\/foto\.[a-z0-9]+(\?|$)/i.test(avatarUrl) && !jaTentou(avatarUrl)) {
        marcar(avatarUrl);
        try {
          const { reduzida } = await comprimirDeUrl(avatarUrl, { maxLado: 480, qualidade: 0.82 });
          const caminho = `${userId}/foto-${Date.now()}.jpg`;
          const { error } = await supabase.storage
            .from("avatars")
            .upload(caminho, reduzida, { cacheControl: CACHE_UM_ANO, contentType: "image/jpeg" });
          if (!error && !cancelado) {
            const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
            await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
          }
        } catch {
          // fica para depois, sem atrapalhar
        }
      }
      // Artes da Romaria Plus guardadas em PNG (as novas são JPEG, bem menores).
      for (const a of artes) {
        if (cancelado) return;
        if (!/\.png(\?|$)/i.test(a.arteUrl) || jaTentou(a.arteUrl)) continue;
        marcar(a.arteUrl);
        try {
          const { reduzida } = await comprimirDeUrl(a.arteUrl, { maxLado: 1920, qualidade: 0.9 });
          if (reduzida.type !== "image/jpeg") continue;
          const caminho = `${userId}/${a.compraId}/arte-${a.indice}.jpg`;
          const { error } = await supabase.storage
            .from("romaria-plus-fotos")
            .upload(caminho, reduzida, { upsert: true, cacheControl: CACHE_UM_ANO, contentType: "image/jpeg" });
          if (error) continue;
          const { data } = supabase.storage.from("romaria-plus-fotos").getPublicUrl(caminho);
          await supabase.rpc("salvar_arte_romaria_plus", {
            p_compra_id: a.compraId,
            p_indice: a.indice,
            p_arte_url: `${data.publicUrl}?v=${Date.now()}`,
          });
        } catch {
          // fica para depois
        }
      }
    }
    // Espera a página terminar de carregar para não disputar a internet.
    const timer = window.setTimeout(rodar, 4000);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [userId, avatarUrl, artes]);

  return null;
}
