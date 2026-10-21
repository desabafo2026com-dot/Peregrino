"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Rodada 78 — menos carga no Supabase (o site estava mais lento):
// - confere a cada 60 s (antes 20 s) e sem consultar o servidor de login
//   (getSession lê a sessão do próprio aparelho);
// - não confere com a aba/app escondido;
// - a posição é enviada no máximo a cada 30 s, e só se a pessoa andou
//   uns 25 m (ou a cada 2 min, mesmo parada). Antes ia a cada leitura do GPS,
//   que pode ser várias vezes por minuto.
const INTERVALO_VERIFICACAO_MS = 60000;
const ENVIO_MIN_MS = 30000;
const ENVIO_MAX_MS = 120000;
const DISTANCIA_MIN_M = 25;

function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Componente global (montado uma única vez no layout) que mantém o
// compartilhamento de localização ativo em segundo plano, independente de
// qual página o peregrino está vendo — assim o compartilhamento é
// realmente ativado ao iniciar a peregrinação e continua enquanto ela
// estiver em andamento e com compartilhar_localizacao = true.
export default function LocationSharingManager() {
  const watchIdRef = useRef<number | null>(null);
  const peregrinacaoIdRef = useRef<string | null>(null);
  const ultimoEnvioRef = useRef<{ t: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;

    function pararWatch() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      peregrinacaoIdRef.current = null;
      ultimoEnvioRef.current = null;
    }

    function iniciarWatch(peregrinacaoId: string, userId: string) {
      if (!navigator.geolocation || watchIdRef.current !== null) return;
      peregrinacaoIdRef.current = peregrinacaoId;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const agora = pos.timestamp || new Date().getTime();
          const atual = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const ultimo = ultimoEnvioRef.current;
          if (ultimo) {
            const passou = agora - ultimo.t;
            if (passou < ENVIO_MIN_MS) return;
            if (passou < ENVIO_MAX_MS && distanciaM(ultimo, atual) < DISTANCIA_MIN_M) return;
          }
          ultimoEnvioRef.current = { t: agora, ...atual };
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
      if (document.hidden && watchIdRef.current === null) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
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
    const aoVoltar = () => {
      if (!document.hidden) verificar();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      pararWatch();
    };
  }, []);

  return null;
}
