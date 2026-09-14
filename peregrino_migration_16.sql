-- =====================================================================
-- MIGRATION 16 — Rodada 9:
-- 1) Esclarece a diferença entre "rota" (o trajeto todo, nomeado pelo par
--    cidade de origem/Aparecida) e "sentido da pista" (mão da rodovia,
--    Norte/Sul, independente da rota). As rotas passam a se chamar
--    "São Paulo - Aparecida" e "Rio de Janeiro - Aparecida" — o slug
--    ('norte'/'sul') não muda, só o nome exibido.
-- 2) Corrige contas de gerente de PAP antigas que ficaram com
--    status = 'pendente' de antes da Migration 7 (que já tornou a
--    aprovação da CONTA desnecessária — só a divulgação do PAP no mapa
--    continua exigindo aprovação, via pontos_apoio.status_aprovacao).
--    Sem este ajuste, o código já corrigido (que não depende mais do
--    status da conta) funciona, mas o rótulo de status dessas contas
--    ficaria incorreto/confuso no painel admin.
-- =====================================================================

update public.rotas set nome = 'São Paulo - Aparecida' where slug = 'norte';
update public.rotas set nome = 'Rio de Janeiro - Aparecida' where slug = 'sul';

update public.gerentes_pap set status = 'aprovado' where status = 'pendente';

-- FIM DA MIGRATION 16
