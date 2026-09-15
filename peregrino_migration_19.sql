-- =====================================================================
-- MIGRATION 19 — Rodada 12, item 1:
-- Lista mais recente de PAP (fornecida pelo usuário) conferida contra a
-- base pública já cadastrada (paps_pre_cadastro). Resultado da
-- conferência: 4 pontos que ainda não estavam na base, e uma correção de
-- sentido (fonte nova confirma "Rio X SP" para a Parada da Relíquia,
-- estava gravado como o sentido oposto). O restante da lista nova bate
-- com o que já estava cadastrado (mesmos nomes/cidades/km).
-- =====================================================================

-- Novos pontos (idempotente: só insere se não existir ainda um com o
-- mesmo nome + cidade).
insert into public.paps_pre_cadastro (nome, cidade, br, km, sentido_pista, data_funcionamento_texto)
select 'Ubuntu', 'Lorena', '116', 52.0, 'sp', '11 a 12 de outubro'
where not exists (
  select 1 from public.paps_pre_cadastro where nome = 'Ubuntu' and cidade = 'Lorena'
);

insert into public.paps_pre_cadastro (nome, cidade, br, km, sentido_pista, data_funcionamento_texto)
select 'Rede Novo Tempo', 'Jacareí', '116', 158.0, null, 'Sem informação de data'
where not exists (
  select 1 from public.paps_pre_cadastro where nome = 'Rede Novo Tempo' and cidade = 'Jacareí'
);

insert into public.paps_pre_cadastro (nome, cidade, br, km, sentido_pista, data_funcionamento_texto)
select 'COMTUR', 'Jacareí', '116', 158.0, null, '15 de agosto a 15 de outubro'
where not exists (
  select 1 from public.paps_pre_cadastro where nome = 'COMTUR' and cidade = 'Jacareí'
);

insert into public.paps_pre_cadastro (nome, cidade, br, km, sentido_pista, data_funcionamento_texto)
select 'Filhos de N.Sra.(Acupuntura)', 'Apoio Móvel (Itinerante)', '116', null, 'rj', 'Sem informação de data'
where not exists (
  select 1 from public.paps_pre_cadastro
  where nome = 'Filhos de N.Sra.(Acupuntura)' and cidade = 'Apoio Móvel (Itinerante)'
);

-- Correção de sentido — a lista mais nova confirma "Rio X SP" (= sp) para
-- este ponto.
update public.paps_pre_cadastro
set sentido_pista = 'sp'
where nome = 'Parada da Relíquia'
  and cidade = 'Rio de Janeiro - Engenheiro Passos'
  and sentido_pista = 'rj';

-- FIM DA MIGRATION 19
