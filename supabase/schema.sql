-- =====================================================================
-- PEREGRINO — Schema do banco de dados (Supabase / Postgres)
-- Rodovia Presidente Dutra até Aparecida-SP
-- =====================================================================
-- Como aplicar: Supabase Dashboard > SQL Editor > cole este arquivo > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type sexo_enum as enum ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type motivo_enum as enum ('promessa', 'curiosidade', 'desafio', 'companhia', 'outros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_peregrinacao_enum as enum ('planejada', 'em_andamento', 'concluida', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lado_rodovia_enum as enum ('marginal_norte', 'marginal_sul', 'pista_norte', 'pista_sul', 'acostamento', 'nao_recomendado');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES — dados básicos do peregrino (estende auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  telefone text,
  cidade text not null,
  faz_parte_grupo boolean not null default false,
  nome_grupo text,
  ja_fez_trajeto boolean not null default false,
  data_nascimento date not null,
  sexo sexo_enum not null,
  religiao text,
  motivo motivo_enum not null,
  motivo_outro_desc text,
  tem_acompanhamento_carro_apoio boolean not null default false,
  aceita_compartilhar_localizacao boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.profiles is 'Dados cadastrais complementares do peregrino, 1:1 com auth.users';

-- ---------------------------------------------------------------------
-- PONTOS DE APOIO — marcados no mapa
-- ---------------------------------------------------------------------
create table if not exists public.pontos_apoio (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid references auth.users(id) on delete set null,
  nome text not null,
  responsavel text,
  telefone text,
  latitude double precision not null,
  longitude double precision not null,
  km_referencia numeric(6,1),
  periodo_funcionamento text,
  servicos text[] not null default '{}',
  contato_doacao text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on column public.pontos_apoio.servicos is 'Ex: {agua, alimentacao, descanso, banheiro, primeiros_socorros, pernoite}';

-- ---------------------------------------------------------------------
-- TRECHOS DE SEGURANÇA — orientação de lado da rodovia por km
-- ---------------------------------------------------------------------
create table if not exists public.trechos_seguranca (
  id uuid primary key default gen_random_uuid(),
  km_inicial numeric(6,1) not null,
  km_final numeric(6,1) not null,
  lado_recomendado lado_rodovia_enum not null,
  observacao text,
  nivel_risco smallint not null default 1 check (nivel_risco between 1 and 5),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PONTOS DE RISCO — pontos específicos de maior perigo
-- ---------------------------------------------------------------------
create table if not exists public.pontos_risco (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  latitude double precision not null,
  longitude double precision not null,
  km_referencia numeric(6,1),
  tipo text not null default 'geral',
  nivel_risco smallint not null default 3 check (nivel_risco between 1 and 5),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PEREGRINAÇÕES — cada "jornada" iniciada por um usuário
-- ---------------------------------------------------------------------
create table if not exists public.peregrinacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status status_peregrinacao_enum not null default 'planejada',
  dias_previstos int,
  data_inicio_prevista date,
  data_inicio timestamptz,
  data_fim timestamptz,
  compartilhar_localizacao boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists idx_peregrinacoes_user on public.peregrinacoes(user_id);
create index if not exists idx_peregrinacoes_status on public.peregrinacoes(status);

-- ---------------------------------------------------------------------
-- LOCALIZAÇÕES ATIVAS — última posição conhecida (1 linha por peregrinação ativa)
-- ---------------------------------------------------------------------
create table if not exists public.localizacoes_ativas (
  peregrinacao_id uuid primary key references public.peregrinacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  precisao_m double precision,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_localizacoes_user on public.localizacoes_ativas(user_id);

-- ---------------------------------------------------------------------
-- CHECK-INS — confirmações de passagem em pontos da rota
-- ---------------------------------------------------------------------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  peregrinacao_id uuid not null references public.peregrinacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ponto_apoio_id uuid references public.pontos_apoio(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_checkins_peregrinacao on public.checkins(peregrinacao_id);

-- ---------------------------------------------------------------------
-- CERTIFICADOS — emitidos ao concluir a peregrinação
-- ---------------------------------------------------------------------
create table if not exists public.certificados (
  id uuid primary key default gen_random_uuid(),
  peregrinacao_id uuid not null references public.peregrinacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  codigo text not null unique,
  nome_peregrino text not null,
  dias_caminhada int,
  data_inicio timestamptz,
  data_fim timestamptz,
  total_checkins int not null default 0,
  emitido_em timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.pontos_apoio enable row level security;
alter table public.trechos_seguranca enable row level security;
alter table public.pontos_risco enable row level security;
alter table public.peregrinacoes enable row level security;
alter table public.localizacoes_ativas enable row level security;
alter table public.checkins enable row level security;
alter table public.certificados enable row level security;

-- profiles: dono lê/edita o próprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- pontos_apoio: leitura pública, escrita por autenticados, edição pelo criador
drop policy if exists "pontos_apoio_select_all" on public.pontos_apoio;
create policy "pontos_apoio_select_all" on public.pontos_apoio for select using (true);

drop policy if exists "pontos_apoio_insert_auth" on public.pontos_apoio;
create policy "pontos_apoio_insert_auth" on public.pontos_apoio for insert to authenticated with check (auth.uid() = criado_por);

drop policy if exists "pontos_apoio_update_own" on public.pontos_apoio;
create policy "pontos_apoio_update_own" on public.pontos_apoio for update to authenticated using (auth.uid() = criado_por);

drop policy if exists "pontos_apoio_delete_own" on public.pontos_apoio;
create policy "pontos_apoio_delete_own" on public.pontos_apoio for delete to authenticated using (auth.uid() = criado_por);

-- trechos_seguranca / pontos_risco: leitura pública (conteúdo curado pela equipe via dashboard)
drop policy if exists "trechos_select_all" on public.trechos_seguranca;
create policy "trechos_select_all" on public.trechos_seguranca for select using (true);

drop policy if exists "riscos_select_all" on public.pontos_risco;
create policy "riscos_select_all" on public.pontos_risco for select using (true);

-- peregrinacoes: dono gerencia as próprias
drop policy if exists "peregrinacoes_select_own" on public.peregrinacoes;
create policy "peregrinacoes_select_own" on public.peregrinacoes for select to authenticated using (auth.uid() = user_id);

drop policy if exists "peregrinacoes_insert_own" on public.peregrinacoes;
create policy "peregrinacoes_insert_own" on public.peregrinacoes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "peregrinacoes_update_own" on public.peregrinacoes;
create policy "peregrinacoes_update_own" on public.peregrinacoes for update to authenticated using (auth.uid() = user_id);

-- localizacoes_ativas: qualquer autenticado pode ver (ajuda a localizar peregrinos); só o dono escreve a própria linha
drop policy if exists "localizacoes_select_auth" on public.localizacoes_ativas;
create policy "localizacoes_select_auth" on public.localizacoes_ativas for select to authenticated using (true);

drop policy if exists "localizacoes_upsert_own" on public.localizacoes_ativas;
create policy "localizacoes_upsert_own" on public.localizacoes_ativas for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "localizacoes_update_own" on public.localizacoes_ativas;
create policy "localizacoes_update_own" on public.localizacoes_ativas for update to authenticated using (auth.uid() = user_id);

drop policy if exists "localizacoes_delete_own" on public.localizacoes_ativas;
create policy "localizacoes_delete_own" on public.localizacoes_ativas for delete to authenticated using (auth.uid() = user_id);

-- checkins: leitura pública (contagem/mapa), escrita só do dono
drop policy if exists "checkins_select_all" on public.checkins;
create policy "checkins_select_all" on public.checkins for select using (true);

drop policy if exists "checkins_insert_own" on public.checkins;
create policy "checkins_insert_own" on public.checkins for insert to authenticated with check (auth.uid() = user_id);

-- certificados: só o dono vê o próprio certificado
drop policy if exists "certificados_select_own" on public.certificados;
create policy "certificados_select_own" on public.certificados for select to authenticated using (auth.uid() = user_id);

drop policy if exists "certificados_insert_own" on public.certificados;
create policy "certificados_insert_own" on public.certificados for insert to authenticated with check (auth.uid() = user_id);

-- =====================================================================
-- FUNÇÃO: verificação pública de certificado por código (sem expor tabela)
-- =====================================================================
create or replace function public.verificar_certificado(p_codigo text)
returns table (
  nome_peregrino text,
  dias_caminhada int,
  data_inicio timestamptz,
  data_fim timestamptz,
  total_checkins int,
  emitido_em timestamptz,
  valido boolean
)
language sql
security definer
set search_path = public
as $$
  select nome_peregrino, dias_caminhada, data_inicio, data_fim, total_checkins, emitido_em, true as valido
  from public.certificados
  where codigo = p_codigo;
$$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;

-- =====================================================================
-- FUNÇÃO: estatísticas agregadas (contagem de peregrinos ativos)
-- =====================================================================
create or replace function public.estatisticas_publicas()
returns table (
  peregrinos_ativos bigint,
  checkins_hoje bigint,
  pontos_apoio_ativos bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento') as peregrinos_ativos,
    (select count(*) from public.checkins where criado_em >= current_date) as checkins_hoje,
    (select count(*) from public.pontos_apoio where ativo = true) as pontos_apoio_ativos;
$$;

grant execute on function public.estatisticas_publicas() to anon, authenticated;

-- =====================================================================
-- SEED: alguns trechos de segurança de exemplo (editar/ajustar depois)
-- =====================================================================
insert into public.trechos_seguranca (km_inicial, km_final, lado_recomendado, observacao, nivel_risco)
values
  (150.0, 160.0, 'marginal_sul', 'Trecho com marginal asfaltada e iluminação. Prefira caminhar de dia.', 2),
  (160.0, 172.0, 'acostamento', 'Sem marginal neste trecho — caminhar sempre de frente para o tráfego, em fila única.', 4)
on conflict do nothing;

-- FIM DO SCHEMA
