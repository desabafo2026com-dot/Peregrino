-- =====================================================================
-- MIGRATION 20 — Rodada 13:
-- (a) permite à administração marcar a posição exata de um PAP do
--     pré-cadastro ainda não vinculado a nenhum gerente (antes só dava
--     para reposicionar um PAP já cadastrado em pontos_apoio);
-- (b) nova tabela de doações livres ("Ajude o desenvolvedor"), sem login,
--     pagas via Mercado Pago — mesmo padrão de segurança já usado pela
--     Romaria Plus (toda escrita só pelo servidor, com a service role).
-- =====================================================================

alter table public.paps_pre_cadastro add column if not exists latitude double precision;
alter table public.paps_pre_cadastro add column if not exists longitude double precision;

comment on column public.paps_pre_cadastro.latitude is 'Posição exata marcada pela administração no mapa (opcional) — quando preenchida (junto com longitude), substitui a aproximação por cidade usada em /mapa.';
comment on column public.paps_pre_cadastro.longitude is 'Ver comentário de latitude.';

-- Até aqui só existia select público (paps_pre_cadastro_select_all) — sem
-- nenhuma política de update, então a administração não conseguia marcar
-- latitude/longitude direto pelo cliente. Política nova, restrita a admin.
drop policy if exists paps_pre_cadastro_update_admin on public.paps_pre_cadastro;
create policy paps_pre_cadastro_update_admin
  on public.paps_pre_cadastro for update
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.doacoes (
  id uuid primary key default gen_random_uuid(),
  valor_centavos int not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado', 'estornado')),
  nome_doador text,
  mp_preference_id text,
  mp_payment_id text,
  criado_em timestamptz not null default now(),
  pago_em timestamptz
);

comment on table public.doacoes is 'Doações livres ("Ajude o desenvolvedor"), sem login, pagas via Mercado Pago (Rodada 13).';

alter table public.doacoes enable row level security;
-- Sem nenhuma política: nem select, nem insert, nem update, nem delete
-- para anon/authenticated — toda escrita e leitura desta tabela passa
-- exclusivamente pelas rotas de servidor (/api/mercadopago/*), com a
-- service role key, que ignora RLS. Mesmo padrão de compras_romaria_plus.

-- FIM DA MIGRATION 20
