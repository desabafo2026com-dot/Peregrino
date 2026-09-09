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

-- =====================================================================
-- MIGRATION 2 — Administradores, PAP, Rotas (Sul/Norte), meio de transporte
-- Como aplicar: Supabase Dashboard > SQL Editor > cole este bloco > Run
-- (idempotente — pode ser executado novamente sem duplicar dados)
-- =====================================================================

-- Enum: meio de transporte da peregrinação
do $$ begin
  create type meio_transporte_enum as enum ('a_pe', 'bicicleta');
exception when duplicate_object then null; end $$;

-- profiles: flag de administrador
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Função auxiliar: o usuário logado é administrador?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- Impede que o próprio usuário se promova a admin editando o perfil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- ROTAS — Sul (Queluz x Aparecida) e Norte (São Paulo x Aparecida)
-- ---------------------------------------------------------------------
create table if not exists public.rotas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  origem text not null,
  destino text not null,
  cor text not null default '#92400e',
  ordem smallint not null default 0,
  criado_em timestamptz not null default now()
);

insert into public.rotas (slug, nome, origem, destino, cor, ordem) values
  ('sul', 'Rota Sul', 'Queluz', 'Aparecida', '#92400e', 1),
  ('norte', 'Rota Norte', 'São Paulo', 'Aparecida', '#1d4ed8', 2)
on conflict (slug) do nothing;

alter table public.rotas enable row level security;
drop policy if exists "rotas_select_all" on public.rotas;
create policy "rotas_select_all" on public.rotas for select using (true);
drop policy if exists "rotas_admin_write" on public.rotas;
create policy "rotas_admin_write" on public.rotas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- trechos_seguranca: agora vinculado a uma rota; escrita restrita a admin
alter table public.trechos_seguranca add column if not exists rota_id uuid references public.rotas(id);
update public.trechos_seguranca set rota_id = (select id from public.rotas where slug = 'sul') where rota_id is null;
alter table public.trechos_seguranca alter column rota_id set not null;

drop policy if exists "trechos_admin_write" on public.trechos_seguranca;
create policy "trechos_admin_write" on public.trechos_seguranca for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- pontos_risco: agora vinculado a uma rota; escrita restrita a admin
alter table public.pontos_risco add column if not exists rota_id uuid references public.rotas(id);

drop policy if exists "riscos_admin_write" on public.pontos_risco;
create policy "riscos_admin_write" on public.pontos_risco for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- pontos_apoio (PAP): cadastro/edição/exclusão agora restritos a administradores
alter table public.pontos_apoio add column if not exists rota_id uuid references public.rotas(id);

drop policy if exists "pontos_apoio_insert_auth" on public.pontos_apoio;
drop policy if exists "pontos_apoio_update_own" on public.pontos_apoio;
drop policy if exists "pontos_apoio_delete_own" on public.pontos_apoio;

drop policy if exists "pontos_apoio_insert_admin" on public.pontos_apoio;
create policy "pontos_apoio_insert_admin" on public.pontos_apoio for insert to authenticated
  with check (public.is_admin());

drop policy if exists "pontos_apoio_update_admin" on public.pontos_apoio;
create policy "pontos_apoio_update_admin" on public.pontos_apoio for update to authenticated
  using (public.is_admin());

drop policy if exists "pontos_apoio_delete_admin" on public.pontos_apoio;
create policy "pontos_apoio_delete_admin" on public.pontos_apoio for delete to authenticated
  using (public.is_admin());

-- peregrinacoes: meio de transporte (a pé / bicicleta) e rota escolhida
alter table public.peregrinacoes add column if not exists meio_transporte meio_transporte_enum not null default 'a_pe';
alter table public.peregrinacoes add column if not exists rota_id uuid references public.rotas(id);

-- admin enxerga todas as peregrinações (dashboard de movimentação)
drop policy if exists "peregrinacoes_select_admin" on public.peregrinacoes;
create policy "peregrinacoes_select_admin" on public.peregrinacoes for select to authenticated
  using (public.is_admin());

-- certificados: guarda rota/meio/duração exata no momento da emissão
alter table public.certificados add column if not exists rota_nome text;
alter table public.certificados add column if not exists meio_transporte meio_transporte_enum;
alter table public.certificados add column if not exists duracao_texto text;

-- Atualiza verificação pública de certificado com os novos campos
drop function if exists public.verificar_certificado(text);
create or replace function public.verificar_certificado(p_codigo text)
returns table (
  nome_peregrino text,
  dias_caminhada int,
  data_inicio timestamptz,
  data_fim timestamptz,
  total_checkins int,
  emitido_em timestamptz,
  rota_nome text,
  meio_transporte text,
  duracao_texto text,
  valido boolean
)
language sql
security definer
set search_path = public
as $$
  select nome_peregrino, dias_caminhada, data_inicio, data_fim, total_checkins, emitido_em,
         rota_nome, meio_transporte::text, duracao_texto, true as valido
  from public.certificados
  where codigo = p_codigo;
$$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;

-- Estatísticas administrativas (dashboard de movimentação e PAP ativos)
create or replace function public.estatisticas_admin()
returns table (
  peregrinos_ativos bigint,
  peregrinacoes_concluidas bigint,
  concluidas_hoje bigint,
  checkins_hoje bigint,
  checkins_total bigint,
  pontos_apoio_ativos bigint,
  pontos_risco_total bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento'),
    (select count(*) from public.peregrinacoes where status = 'concluida'),
    (select count(*) from public.peregrinacoes where status = 'concluida' and data_fim >= current_date),
    (select count(*) from public.checkins where criado_em >= current_date),
    (select count(*) from public.checkins),
    (select count(*) from public.pontos_apoio where ativo = true),
    (select count(*) from public.pontos_risco);
end;
$$;

grant execute on function public.estatisticas_admin() to authenticated;

-- =====================================================================
-- MIGRATION 3 — Gerente de PAP, check-ins por cidade, privacidade de
-- localização, tema, avatar/foto, grupo por peregrinação, novos motivos
-- Como aplicar: Supabase Dashboard > SQL Editor > cole este bloco > Run
-- (idempotente — pode ser executado novamente sem duplicar dados)
-- =====================================================================

-- Novos motivos de peregrinação
alter type motivo_enum add value if not exists 'fe';
alter type motivo_enum add value if not exists 'aventura';
alter type motivo_enum add value if not exists 'religiosidade';

-- profiles: UF de origem, descrição de religião "outros" e avatar/foto
alter table public.profiles add column if not exists uf text;
alter table public.profiles add column if not exists religiao_outro_desc text;
alter table public.profiles add column if not exists avatar_url text;

-- peregrinacoes: "em grupo" específico desta caminhada (independente do perfil geral)
alter table public.peregrinacoes add column if not exists em_grupo boolean not null default false;
alter table public.peregrinacoes add column if not exists nome_grupo text;

-- ---------------------------------------------------------------------
-- PRIVACIDADE DA LOCALIZAÇÃO — só administradores (e o próprio peregrino)
-- veem a posição; NÃO é mais visível para outros peregrinos.
-- A localização serve para avisar sobre condições adversas e para busca
-- em caso de emergência, não para que outros peregrinos vejam.
-- ---------------------------------------------------------------------
drop policy if exists "localizacoes_select_auth" on public.localizacoes_ativas;
drop policy if exists "localizacoes_select_admin_ou_own" on public.localizacoes_ativas;
create policy "localizacoes_select_admin_ou_own" on public.localizacoes_ativas for select to authenticated
  using (public.is_admin() or auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- GERENTES DE PAP — cadastro separado do peregrino, precisa de aprovação
-- do administrador antes de poder cadastrar/gerenciar seu PAP.
-- ---------------------------------------------------------------------
create table if not exists public.gerentes_pap (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  telefone text not null,
  nome_organizacao text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  observacao_admin text,
  aprovado_por uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now()
);

comment on table public.gerentes_pap is 'Cadastro de gerentes de PAP, separado do peregrino. Precisa aprovação de administrador (status) antes de poder cadastrar PAP.';

alter table public.gerentes_pap enable row level security;

drop policy if exists "gerentes_pap_select_admin_ou_own" on public.gerentes_pap;
create policy "gerentes_pap_select_admin_ou_own" on public.gerentes_pap for select to authenticated
  using (public.is_admin() or auth.uid() = id);

drop policy if exists "gerentes_pap_insert_own" on public.gerentes_pap;
create policy "gerentes_pap_insert_own" on public.gerentes_pap for insert to authenticated
  with check (auth.uid() = id and status = 'pendente');

drop policy if exists "gerentes_pap_update_admin" on public.gerentes_pap;
create policy "gerentes_pap_update_admin" on public.gerentes_pap for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Função auxiliar: o usuário logado é um gerente de PAP já aprovado?
create or replace function public.is_gerente_pap_aprovado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gerentes_pap where id = auth.uid() and status = 'aprovado'
  );
$$;

grant execute on function public.is_gerente_pap_aprovado() to authenticated;

-- pontos_apoio (PAP): agora também pode ser cadastrado/gerido por um
-- gerente de PAP aprovado, além do administrador.
alter table public.pontos_apoio add column if not exists gerente_id uuid references public.gerentes_pap(id) on delete set null;

drop policy if exists "pontos_apoio_insert_admin" on public.pontos_apoio;
drop policy if exists "pontos_apoio_insert_admin_ou_gerente" on public.pontos_apoio;
create policy "pontos_apoio_insert_admin_ou_gerente" on public.pontos_apoio for insert to authenticated
  with check (
    public.is_admin()
    or (gerente_id = auth.uid() and public.is_gerente_pap_aprovado())
  );

drop policy if exists "pontos_apoio_update_admin" on public.pontos_apoio;
drop policy if exists "pontos_apoio_update_admin_ou_gerente" on public.pontos_apoio;
create policy "pontos_apoio_update_admin_ou_gerente" on public.pontos_apoio for update to authenticated
  using (public.is_admin() or gerente_id = auth.uid())
  with check (public.is_admin() or gerente_id = auth.uid());

drop policy if exists "pontos_apoio_delete_admin" on public.pontos_apoio;
drop policy if exists "pontos_apoio_delete_admin_ou_gerente" on public.pontos_apoio;
create policy "pontos_apoio_delete_admin_ou_gerente" on public.pontos_apoio for delete to authenticated
  using (public.is_admin() or gerente_id = auth.uid());

-- ---------------------------------------------------------------------
-- PONTOS DE CHECK-IN — um ponto seguro por cidade de cada rota. O início
-- da peregrinação já conta como o primeiro check-in (ordem = 1).
-- ---------------------------------------------------------------------
create table if not exists public.pontos_checkin (
  id uuid primary key default gen_random_uuid(),
  rota_id uuid not null references public.rotas(id) on delete cascade,
  cidade text not null,
  ordem smallint not null,
  km_aproximado numeric(6,1),
  latitude double precision not null,
  longitude double precision not null,
  descricao text,
  criado_em timestamptz not null default now(),
  unique (rota_id, ordem)
);

comment on column public.pontos_checkin.km_aproximado is 'Distância aproximada (km) desde a origem da rota — estimativa, não é o km oficial da rodovia.';

alter table public.pontos_checkin enable row level security;
drop policy if exists "pontos_checkin_select_all" on public.pontos_checkin;
create policy "pontos_checkin_select_all" on public.pontos_checkin for select using (true);
drop policy if exists "pontos_checkin_admin_write" on public.pontos_checkin;
create policy "pontos_checkin_admin_write" on public.pontos_checkin for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- checkins: agora também pode referenciar um ponto de check-in de cidade
alter table public.checkins add column if not exists ponto_checkin_id uuid references public.pontos_checkin(id) on delete set null;

-- Seed: um ponto de check-in por cidade em cada rota (coordenadas
-- aproximadas do centro da cidade / km estimado a partir da origem).
insert into public.pontos_checkin (rota_id, cidade, ordem, km_aproximado, latitude, longitude, descricao)
select r.id, x.cidade, x.ordem, x.km, x.lat, x.lng, x.descricao
from (values
  ('norte', 'São Paulo', 1::smallint, 0.0, -23.5505, -46.6333, 'Marco inicial da Rota Norte.'),
  ('norte', 'Guarulhos', 2::smallint, 20.0, -23.4538, -46.5333, null),
  ('norte', 'Arujá', 3::smallint, 40.0, -23.3961, -46.3211, null),
  ('norte', 'Santa Isabel', 4::smallint, 55.0, -23.3175, -46.2222, null),
  ('norte', 'Jacareí', 5::smallint, 80.0, -23.3053, -45.9658, null),
  ('norte', 'São José dos Campos', 6::smallint, 90.0, -23.2237, -45.9009, null),
  ('norte', 'Caçapava', 7::smallint, 105.0, -23.0989, -45.7075, null),
  ('norte', 'Taubaté', 8::smallint, 115.0, -23.0264, -45.5553, null),
  ('norte', 'Pindamonhangaba', 9::smallint, 135.0, -22.9247, -45.4614, null),
  ('norte', 'Roseira', 10::smallint, 150.0, -22.8967, -45.3081, null),
  ('norte', 'Guaratinguetá', 11::smallint, 160.0, -22.8161, -45.1919, null),
  ('norte', 'Aparecida', 12::smallint, 170.0, -22.8494, -45.2317, 'Chegada — Basílica de Nossa Senhora Aparecida.'),
  ('sul', 'Queluz', 1::smallint, 0.0, -22.5354, -44.7692, 'Marco inicial da Rota Sul.'),
  ('sul', 'Lavrinhas', 2::smallint, 12.0, -22.5719, -44.9082, null),
  ('sul', 'Cruzeiro', 3::smallint, 22.0, -22.5794, -44.9678, null),
  ('sul', 'Cachoeira Paulista', 4::smallint, 35.0, -22.6667, -45.0083, null),
  ('sul', 'Aparecida', 5::smallint, 45.0, -22.8494, -45.2317, 'Chegada — Basílica de Nossa Senhora Aparecida.')
) as x(rota_slug, cidade, ordem, km, lat, lng, descricao)
join public.rotas r on r.slug = x.rota_slug
on conflict (rota_id, ordem) do nothing;

-- Estatísticas administrativas: inclui gerentes de PAP pendentes de aprovação
drop function if exists public.estatisticas_admin();
create or replace function public.estatisticas_admin()
returns table (
  peregrinos_ativos bigint,
  peregrinacoes_concluidas bigint,
  concluidas_hoje bigint,
  checkins_hoje bigint,
  checkins_total bigint,
  pontos_apoio_ativos bigint,
  pontos_risco_total bigint,
  gerentes_pendentes bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento'),
    (select count(*) from public.peregrinacoes where status = 'concluida'),
    (select count(*) from public.peregrinacoes where status = 'concluida' and data_fim >= current_date),
    (select count(*) from public.checkins where criado_em >= current_date),
    (select count(*) from public.checkins),
    (select count(*) from public.pontos_apoio where ativo = true),
    (select count(*) from public.pontos_risco),
    (select count(*) from public.gerentes_pap where status = 'pendente');
end;
$$;

grant execute on function public.estatisticas_admin() to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE — bucket público para foto de perfil (avatar)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_all" on storage.objects;
create policy "avatars_select_all" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- FIM DO SCHEMA
