-- =====================================================================
-- MIGRATION 17 — Rodada 10:
-- Riscos informados por peregrinos (riscos_informados) ficam visíveis no
-- mapa/trajeto por no máximo 1 hora desde o envio, mesmo quando confirmados
-- pela administração — antes, um relato "aprovado" ficava visível pra
-- sempre (sem expiração), o que não era a intenção: o aviso de peregrino é
-- pensado para ser efêmero (chuva, sinistro recente etc.); um risco
-- permanente de verdade deve virar um `pontos_risco` curado pela
-- administração (o que a tela de confirmação já faz), não continuar como
-- aviso "no ar" indefinidamente.
-- =====================================================================

drop policy if exists "riscos_informados_select_publicos" on public.riscos_informados;
create policy "riscos_informados_select_publicos" on public.riscos_informados for select
  using (
    criado_em > now() - interval '1 hour'
    and (
      status = 'aprovado'
      or categoria = 'chuva'
      or criado_em <= now() - interval '30 minutes'
    )
  );

-- FIM DA MIGRATION 17
