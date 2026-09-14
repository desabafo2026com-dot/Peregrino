-- =====================================================================
-- MIGRATION 18 — Rodada 11:
-- (a) corrige a exclusão de "locais de risco" (pontos_risco), que estava
--     bloqueada por uma foreign key sem "on delete" quando existia um
--     relato de peregrino (riscos_informados) apontando pra ele;
-- (b) reduz o nível de risco para só 3 opções — Moderado, Alto e Muito
--     alto — atualizando dados antigos de nível 1/2 para 3 e travando o
--     banco em 3-5 (o app já só oferece essas 3 no formulário);
-- (c) adiciona pontos de check-in que faltavam no trajeto de referência
--     (Guararema na Rota Norte; Silveiras, Canas e Lorena na Rota Sul),
--     para a linha desenhada no mapa acompanhar melhor a curva real da
--     Rodovia Presidente Dutra em vez de cortar caminho em linha reta
--     entre cidades distantes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) Excluir um local de risco não pode mais falhar por causa de um
-- relato de peregrino vinculado a ele — o relato continua existindo
-- (histórico), só perde a referência ao ponto oficial removido.
-- ---------------------------------------------------------------------
alter table public.riscos_informados
  drop constraint if exists riscos_informados_ponto_risco_id_fkey;
alter table public.riscos_informados
  add constraint riscos_informados_ponto_risco_id_fkey
  foreign key (ponto_risco_id) references public.pontos_risco(id) on delete set null;

-- ---------------------------------------------------------------------
-- (b) Só 3 níveis de risco a partir de agora: Moderado (3), Alto (4) e
-- Muito alto (5).
-- ---------------------------------------------------------------------
update public.pontos_risco set nivel_risco = 3 where nivel_risco < 3;
update public.riscos_informados set nivel_risco = 3 where nivel_risco < 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pontos_risco_nivel_risco_3_a_5'
  ) then
    alter table public.pontos_risco
      add constraint pontos_risco_nivel_risco_3_a_5 check (nivel_risco between 3 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'riscos_informados_nivel_risco_3_a_5'
  ) then
    alter table public.riscos_informados
      add constraint riscos_informados_nivel_risco_3_a_5 check (nivel_risco between 3 and 5);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- (c) Novos pontos de check-in — só INSERT + UPDATE de "ordem" nos já
-- existentes (nunca delete), para não perder o vínculo de check-ins reais
-- já registrados por peregrinos (checkins.ponto_checkin_id).
-- ---------------------------------------------------------------------

-- Rota Norte: abre espaço na ordem 5 (Guararema entra entre Santa Isabel
-- e Jacareí — a Dutra faz essa curva de verdade, pela Serra dos Cristais).
update public.pontos_checkin set ordem = 12 where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 11;
update public.pontos_checkin set ordem = 11 where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 10;
update public.pontos_checkin set ordem = 10 where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 9;
update public.pontos_checkin set ordem = 9  where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 8;
update public.pontos_checkin set ordem = 8  where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 7;
update public.pontos_checkin set ordem = 7  where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 6;
update public.pontos_checkin set ordem = 6  where rota_id = (select id from public.rotas where slug = 'norte') and ordem = 5;

insert into public.pontos_checkin (rota_id, cidade, ordem, km_aproximado, latitude, longitude, descricao)
select r.id, 'Guararema', 5::smallint, 65.0, -23.4150, -46.0350, null
from public.rotas r
where r.slug = 'norte'
on conflict (rota_id, ordem) do nothing;

-- Rota Sul: abre espaço nas ordens 4 (Silveiras, entre Cruzeiro e
-- Cachoeira Paulista), 6 e 7 (Canas e Lorena, entre Cachoeira Paulista e
-- Guaratinguetá) — a rota pulava direto de Cruzeiro pra Cachoeira
-- Paulista e de Cachoeira Paulista pra Guaratinguetá, bem longe da curva
-- real da rodovia.
update public.pontos_checkin set ordem = 9 where rota_id = (select id from public.rotas where slug = 'sul') and ordem = 6;
update public.pontos_checkin set ordem = 8 where rota_id = (select id from public.rotas where slug = 'sul') and ordem = 5;
update public.pontos_checkin set ordem = 5 where rota_id = (select id from public.rotas where slug = 'sul') and ordem = 4;

insert into public.pontos_checkin (rota_id, cidade, ordem, km_aproximado, latitude, longitude, descricao)
select r.id, x.cidade, x.ordem, x.km, x.lat, x.lng, null
from (values
  ('Silveiras', 4::smallint, 28.0, -22.6639::double precision, -44.8528::double precision),
  ('Canas', 6::smallint, 37.0, -22.7022::double precision, -45.0532::double precision),
  ('Lorena', 7::smallint, 39.0, -22.7308::double precision, -45.1247::double precision)
) as x(cidade, ordem, km, lat, lng)
join public.rotas r on r.slug = 'sul'
on conflict (rota_id, ordem) do nothing;

-- FIM DA MIGRATION 18
