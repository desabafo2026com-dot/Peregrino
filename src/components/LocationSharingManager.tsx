"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const INTERVALO_VERIFICACAO_MS = 20000;

// Componente global (montado uma única vez no layout) que mantém o
// compartilhamento de localização ativo em segundo plano, independente de
// qual página o peregrino está vendo — assim o compartilhamento é
// realmente ativado ao iniciar a peregrinação e continua enquanto ela
// estiver em andamento e com compartilhar_localizacao = true.
export default function LocationSharingManager() {
  const watchIdRef = useRef<number | null>(null);
  const peregrinacaoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;

    function pararWatch() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      peregrinacaoIdRef.current = null;
    }

    function iniciarWatch(peregrinacaoId: string, userId: string) {
      if (!navigator.geolocation || watchIdRef.current !== null) return;
      peregrinacaoIdRef.current = peregrinacaoId;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          supabase
            .from("localizacoes_ativas")
            .upsert({
              peregrinacao_id: peregrinacaoId,
              user_id: userId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              precisao_m: pos.coords.accuracy,
              atualizado_em: new Date().toISOString(),
            })
            .then(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
      );
    }

    async function verificar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelado) return;

      if (!user) {
        pararWatch();
        return;
      }

      const { data: peregrinacao } = await supabase
        .from("peregrinacoes")
        .select("id, compartilhar_localizacao")
        .eq("user_id", user.id)
        .eq("status", "em_andamento")
        .maybeSingle();

      if (cancelado) return;

      if (!peregrinacao || !peregrinacao.compartilhar_localizacao) {
        pararWatch();
        return;
      }

      if (peregrinacaoIdRef.current !== peregrinacao.id) {
        pararWatch();
        iniciarWatch(peregrinacao.id, user.id);
      }
    }

    verificar();
    const intervalo = setInterval(verificar, INTERVALO_VERIFICACAO_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      pararWatch();
    };
  }, []);

  return null;
}
