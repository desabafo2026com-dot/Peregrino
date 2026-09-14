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

-- =====================================================================
-- MIGRATION 4 — Agentes/admins extras, aprovação de divulgação do PAP
-- separada da conta do gerente, horário de funcionamento do PAP,
-- reabrir/excluir peregrinação, rotas renomeadas (Norte primeiro),
-- elegibilidade do certificado
-- Como aplicar: Supabase Dashboard > SQL Editor > cole este bloco > Run
-- (idempotente)
-- =====================================================================

-- ---------------------------------------------------------------------
-- PROFILES — campos de peregrino agora opcionais (contas de agente/admin
-- criadas pela administração não são peregrinos e não preenchem esses
-- dados) + papel de agente
-- ---------------------------------------------------------------------
alter table public.profiles alter column cidade drop not null;
alter table public.profiles alter column data_nascimento drop not null;
alter table public.profiles alter column sexo drop not null;
alter table public.profiles alter column motivo drop not null;

alter table public.profiles add column if not exists is_agente boolean not null default false;

create or replace function public.is_agente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_agente from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_agente() to authenticated, anon;

-- Autopromoção continua bloqueada (nem admin, nem agente, por edição própria)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
    and is_agente = (select p.is_agente from public.profiles p where p.id = auth.uid())
  );

-- Um usuário só pode criar o PRÓPRIO perfil (upsert normal do app) e nunca
-- já nascendo admin/agente por essa via
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
  with check (auth.uid() = id and is_admin = false and is_agente = false);

-- Administradores podem criar e editar QUALQUER perfil — é assim que o
-- admin cadastra contas de agente/outro admin (e-mail e senha próprios,
-- via signUp comum; o perfil com is_admin/is_agente é criado por este
-- caminho, nunca pelo próprio usuário)
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles for insert to authenticated
  with check (public.is_admin());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles for select to authenticated
  using (public.is_admin() or auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- AGENTES — enxergam painel e mapas administrativos, mas só podem
-- INSERIR trechos de segurança e locais de risco (não editam/excluem,
-- não mexem em PAP, gerentes ou rotas)
-- ---------------------------------------------------------------------
drop policy if exists "trechos_admin_write" on public.trechos_seguranca;
drop policy if exists "trechos_insert_admin_ou_agente" on public.trechos_seguranca;
create policy "trechos_insert_admin_ou_agente" on public.trechos_seguranca for insert to authenticated
  with check (public.is_admin() or public.is_agente());
drop policy if exists "trechos_update_admin" on public.trechos_seguranca;
create policy "trechos_update_admin" on public.trechos_seguranca for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "trechos_delete_admin" on public.trechos_seguranca;
create policy "trechos_delete_admin" on public.trechos_seguranca for delete to authenticated
  using (public.is_admin());

drop policy if exists "riscos_admin_write" on public.pontos_risco;
drop policy if exists "riscos_insert_admin_ou_agente" on public.pontos_risco;
create policy "riscos_insert_admin_ou_agente" on public.pontos_risco for insert to authenticated
  with check (public.is_admin() or public.is_agente());
drop policy if exists "riscos_update_admin" on public.pontos_risco;
create policy "riscos_update_admin" on public.pontos_risco for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "riscos_delete_admin" on public.pontos_risco;
create policy "riscos_delete_admin" on public.pontos_risco for delete to authenticated
  using (public.is_admin());

-- certificados: administrador também pode conferir (além do próprio dono)
drop policy if exists "certificados_select_admin" on public.certificados;
create policy "certificados_select_admin" on public.certificados for select to authenticated
  using (public.is_admin() or auth.uid() = user_id);

-- peregrinacoes: o próprio peregrino pode excluir sua peregrinação
-- (reabrir/editar já é possível via peregrinacoes_update_own)
drop policy if exists "peregrinacoes_delete_own" on public.peregrinacoes;
create policy "peregrinacoes_delete_own" on public.peregrinacoes for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- GERENTES DE PAP — cadastro passa a ser direto (e-mail/senha próprios,
-- com confirmação por e-mail); não há mais aprovação prévia da CONTA.
-- O que fica pendente de aprovação do administrador é a divulgação do
-- PAP cadastrado por ela no mapa (ver pontos_apoio.status_aprovacao).
-- ---------------------------------------------------------------------
alter table public.gerentes_pap alter column status set default 'aprovado';

-- ---------------------------------------------------------------------
-- PONTOS DE APOIO (PAP) — aprovação de divulgação no mapa (separada da
-- conta do gerente) + horário de funcionamento (aberto agora)
-- ---------------------------------------------------------------------
alter table public.pontos_apoio add column if not exists status_aprovacao text not null default 'aprovado' check (status_aprovacao in ('pendente','aprovado','rejeitado'));
alter table public.pontos_apoio add column if not exists aberto_agora boolean not null default true;
alter table public.pontos_apoio add column if not exists observacao_admin text;

comment on column public.pontos_apoio.status_aprovacao is 'PAP cadastrado por gerente nasce pendente; só aparece no mapa público após aprovado por um admin. PAP cadastrado por admin já nasce aprovado.';
comment on column public.pontos_apoio.aberto_agora is 'Controlado pelo próprio gerente do PAP, conforme o horário real de funcionamento.';

drop policy if exists "pontos_apoio_insert_admin_ou_gerente" on public.pontos_apoio;
create policy "pontos_apoio_insert_admin_ou_gerente" on public.pontos_apoio for insert to authenticated
  with check (
    public.is_admin()
    or (
      gerente_id = auth.uid()
      and public.is_gerente_pap_aprovado()
      and status_aprovacao = 'pendente'
    )
  );

drop policy if exists "pontos_apoio_update_admin_ou_gerente" on public.pontos_apoio;
create policy "pontos_apoio_update_admin_ou_gerente" on public.pontos_apoio for update to authenticated
  using (public.is_admin() or gerente_id = auth.uid())
  with check (
    public.is_admin()
    or (
      gerente_id = auth.uid()
      and status_aprovacao = (select p.status_aprovacao from public.pontos_apoio p where p.id = pontos_apoio.id)
    )
  );

-- ---------------------------------------------------------------------
-- ROTAS — Norte passa a ser a primeira (maior procura); Sul renomeada
-- para refletir que os peregrinos vêm do Rio de Janeiro
-- ---------------------------------------------------------------------
update public.rotas set nome = 'Rota Norte', origem = 'São Paulo', destino = 'Aparecida', ordem = 1 where slug = 'norte';
update public.rotas set nome = 'Rota Sul', origem = 'Rio de Janeiro', destino = 'Aparecida', ordem = 2 where slug = 'sul';

-- =====================================================================
-- MIGRATION 5 — Localização completa do PAP no cadastro do gerente
-- (cidade, km, sentido da pista, período), telefone/doações opcionais e
-- exibidos conforme autorização, meio de transporte "outros", estatísticas
-- detalhadas de peregrinos/PAP para o painel admin com drill-down, e
-- recuperação de senha (usa o fluxo padrão do Supabase Auth, sem alteração
-- de schema).
-- Como aplicar: Supabase Dashboard > SQL Editor > cole este bloco > Run
-- (idempotente)
-- =====================================================================

-- ---------------------------------------------------------------------
-- PONTOS DE APOIO — localização descritiva (cidade, sentido da pista) e
-- controles de privacidade/divulgação do gerente
-- ---------------------------------------------------------------------
alter table public.pontos_apoio add column if not exists cidade text;
alter table public.pontos_apoio add column if not exists sentido_pista text check (sentido_pista in ('sp', 'rj'));
alter table public.pontos_apoio add column if not exists exibir_telefone boolean not null default true;
alter table public.pontos_apoio add column if not exists aceita_doacoes boolean not null default false;
alter table public.pontos_apoio add column if not exists doacao_necessidade text;

comment on column public.pontos_apoio.sentido_pista is 'Sentido da pista onde o PAP fica: sp (sentido São Paulo / Rota Norte) ou rj (sentido Rio de Janeiro / Rota Sul).';
comment on column public.pontos_apoio.exibir_telefone is 'Se falso, o telefone do PAP não é exibido publicamente no mapa (uso interno da administração).';
comment on column public.pontos_apoio.aceita_doacoes is 'Se verdadeiro, exibe no mapa que o PAP aceita doações e o que precisa.';

-- ---------------------------------------------------------------------
-- MEIO DE TRANSPORTE — opção "outros", com descrição livre
-- ---------------------------------------------------------------------
alter type meio_transporte_enum add value if not exists 'outros';

alter table public.peregrinacoes add column if not exists meio_transporte_outro_desc text;
alter table public.certificados add column if not exists meio_transporte_outro_desc text;

-- Atualiza verificação pública de certificado com o novo campo
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
  meio_transporte_outro_desc text,
  duracao_texto text,
  valido boolean
)
language sql
security definer
set search_path = public
as $$
  select nome_peregrino, dias_caminhada, data_inicio, data_fim, total_checkins, emitido_em,
         rota_nome, meio_transporte::text, meio_transporte_outro_desc, duracao_texto, true as valido
  from public.certificados
  where codigo = p_codigo;
$$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- ESTATÍSTICAS PÚBLICAS (home) — peregrinos ativos, check-ins realizados
-- (total), PAP ativos e peregrinações concluídas
-- ---------------------------------------------------------------------
drop function if exists public.estatisticas_publicas();
create or replace function public.estatisticas_publicas()
returns table (
  peregrinos_ativos bigint,
  checkins_hoje bigint,
  checkins_total bigint,
  pontos_apoio_ativos bigint,
  peregrinacoes_concluidas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento') as peregrinos_ativos,
    (select count(*) from public.checkins where criado_em >= current_date) as checkins_hoje,
    (select count(*) from public.checkins) as checkins_total,
    (select count(*) from public.pontos_apoio where ativo = true and status_aprovacao = 'aprovado') as pontos_apoio_ativos,
    (select count(*) from public.peregrinacoes where status = 'concluida') as peregrinacoes_concluidas;
$$;

grant execute on function public.estatisticas_publicas() to anon, authenticated;

-- ---------------------------------------------------------------------
-- ESTATÍSTICAS ADMINISTRATIVAS — módulos PEREGRINOS (cadastrados, ativos,
-- concluídas, concluídas hoje) e PAP (cadastrados, ativos, pendentes,
-- locais de risco) para o drill-down do painel
-- ---------------------------------------------------------------------
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
  gerentes_pendentes bigint,
  peregrinos_cadastrados bigint,
  pap_cadastrados bigint,
  pap_ativos bigint,
  pap_pendentes bigint
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
    (select count(*) from public.pontos_apoio where ativo = true and status_aprovacao = 'aprovado'),
    (select count(*) from public.pontos_risco),
    (select count(*) from public.gerentes_pap where status = 'pendente'),
    (select count(*) from public.profiles p
       where p.is_admin = false and p.is_agente = false
         and not exists (select 1 from public.gerentes_pap g where g.id = p.id)),
    (select count(*) from public.pontos_apoio),
    (select count(*) from public.pontos_apoio where aberto_agora = true and status_aprovacao = 'aprovado'),
    (select count(*) from public.pontos_apoio where status_aprovacao = 'pendente');
end;
$$;

grant execute on function public.estatisticas_admin() to authenticated;

-- =====================================================================
-- MIGRATION 6 — correção de papel do Gerente de PAP (não é mais tratado
-- como peregrino após login), riscos informados por peregrinos (nova
-- tabela, pendente de revisão da administração), rotas renomeadas para
-- "Sentido Norte"/"Sentido Sul", e estatísticas administrativas
-- reorganizadas em 4 grupos (Peregrinos, Peregrinações, PAP, Riscos).
-- =====================================================================

update public.rotas set nome = 'Sentido Norte' where slug = 'norte';
update public.rotas set nome = 'Sentido Sul' where slug = 'sul';

-- ---------------------------------------------------------------------
-- RISCOS INFORMADOS — relatos de risco enviados por peregrinos durante a
-- caminhada, pendentes de revisão da administração. Quando aprovado, gera
-- um ponto_risco oficial (ponto_risco_id aponta para ele).
-- ---------------------------------------------------------------------
create table if not exists public.riscos_informados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null default 'geral',
  nivel_risco smallint not null default 3 check (nivel_risco between 1 and 5),
  latitude double precision not null,
  longitude double precision not null,
  km_referencia numeric(6,1),
  rota_id uuid references public.rotas(id),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  observacao_admin text,
  ponto_risco_id uuid references public.pontos_risco(id),
  criado_em timestamptz not null default now()
);

alter table public.riscos_informados enable row level security;

drop policy if exists "riscos_informados_insert_own" on public.riscos_informados;
create policy "riscos_informados_insert_own" on public.riscos_informados for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "riscos_informados_select_own_ou_admin" on public.riscos_informados;
create policy "riscos_informados_select_own_ou_admin" on public.riscos_informados for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_agente)
  );

drop policy if exists "riscos_informados_update_admin" on public.riscos_informados;
create policy "riscos_informados_update_admin" on public.riscos_informados for update to authenticated
  using (public.is_admin());

drop policy if exists "riscos_informados_delete_admin" on public.riscos_informados;
create policy "riscos_informados_delete_admin" on public.riscos_informados for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Estatísticas públicas: peregrinações concluídas agora conta apenas as
-- que de fato emitiram certificado (consistente com a regra de
-- elegibilidade), não apenas status = 'concluida'.
-- ---------------------------------------------------------------------
drop function if exists public.estatisticas_publicas();
create or replace function public.estatisticas_publicas()
returns table (
  peregrinos_ativos bigint,
  checkins_hoje bigint,
  checkins_total bigint,
  pontos_apoio_ativos bigint,
  peregrinacoes_concluidas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento'),
    (select count(*) from public.checkins where criado_em >= current_date),
    (select count(*) from public.checkins),
    (select count(*) from public.pontos_apoio where ativo = true and status_aprovacao = 'aprovado'),
    (select count(*) from public.certificados);
$$;

grant execute on function public.estatisticas_publicas() to anon, authenticated;

-- ---------------------------------------------------------------------
-- MIGRATION 7 — correção crítica: a política de insert de gerentes_pap
-- ainda exigia status = 'pendente', mas a coluna passou a ter default
-- 'aprovado' (migration 4/expansão v3). Resultado: toda tentativa de
-- criar o registro do gerente (seja na tela de cadastro, seja na
-- autocorreção feita em /gerente-pap após confirmar o e-mail) era
-- bloqueada pelo RLS, e o gerente nunca via seus próprios dados.
-- ---------------------------------------------------------------------
drop policy if exists "gerentes_pap_insert_own" on public.gerentes_pap;
create policy "gerentes_pap_insert_own" on public.gerentes_pap for insert to authenticated
  with check (auth.uid() = id);

-- =====================================================================
-- MIGRATION 8 — calendário de datas de funcionamento do PAP: além do
-- horário semanal (dias da semana + hora), o gerente agora pode marcar
-- datas específicas (ou um período) em que o PAP realmente vai funcionar
-- (ex.: só durante uma festa/temporada). Um PAP sem datas marcadas
-- continua sempre ativo (comportamento anterior, sem quebrar cadastros
-- já existentes). "PAP ativos" na home e no admin passam a considerar
-- essa data.
-- =====================================================================

alter table public.pontos_apoio add column if not exists datas_funcionamento date[] not null default '{}';

comment on column public.pontos_apoio.datas_funcionamento is 'Datas específicas (ou período) em que o PAP funciona. Vazio = sem restrição, sempre ativo.';

drop function if exists public.estatisticas_publicas();
create or replace function public.estatisticas_publicas()
returns table (
  peregrinos_ativos bigint,
  checkins_hoje bigint,
  checkins_total bigint,
  pontos_apoio_ativos bigint,
  peregrinacoes_concluidas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento'),
    (select count(*) from public.checkins where criado_em >= current_date),
    (select count(*) from public.checkins),
    (select count(*) from public.pontos_apoio
       where ativo = true and status_aprovacao = 'aprovado'
         and (cardinality(datas_funcionamento) = 0 or current_date = any(datas_funcionamento))),
    (select count(*) from public.certificados);
$$;

grant execute on function public.estatisticas_publicas() to anon, authenticated;

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
  gerentes_pendentes bigint,
  peregrinos_cadastrados bigint,
  pap_cadastrados bigint,
  pap_ativos bigint,
  pap_pendentes bigint
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
    (select count(*) from public.pontos_apoio
       where ativo = true and status_aprovacao = 'aprovado'
         and (cardinality(datas_funcionamento) = 0 or current_date = any(datas_funcionamento))),
    (select count(*) from public.pontos_risco),
    (select count(*) from public.gerentes_pap where status = 'pendente'),
    (select count(*) from public.profiles p
       where p.is_admin = false and p.is_agente = false
         and not exists (select 1 from public.gerentes_pap g where g.id = p.id)),
    (select count(*) from public.pontos_apoio),
    (select count(*) from public.pontos_apoio
       where aberto_agora = true and status_aprovacao = 'aprovado'
         and (cardinality(datas_funcionamento) = 0 or current_date = any(datas_funcionamento))),
    (select count(*) from public.pontos_apoio where status_aprovacao = 'pendente');
end;
$$;

grant execute on function public.estatisticas_admin() to authenticated;

-- =====================================================================
-- MIGRATION 9 — (1) PAP só conta como ativo (contador da home/admin e mapa
-- de "PAPs ativos" da peregrinação) nas datas explicitamente marcadas no
-- calendário; sem nenhuma data marcada, o PAP não entra mais nessa conta
-- por padrão (revisão da Migration 8, a pedido do usuário). O mapa geral
-- de PAP (/mapa) continua mostrando todos os cadastrados aprovados,
-- independente de data — esse filtro já foi removido em código.
-- (2) Pontos de risco passam a ter um "sentido da via" (mesmo domínio de
-- pontos_apoio.sentido_pista), exibido no mapa como "km X N/S".
-- (3) Correção de dado geográfico: Guaratinguetá fica depois de Aparecida
-- (sentido São Paulo → Rio), então não pertence à Rota Norte (que chega
-- em Aparecida vindo de São Paulo) e sim à Rota Sul (que chega em
-- Aparecida vindo de Queluz/Rio, passando por Cachoeira Paulista antes).
-- =====================================================================

comment on column public.pontos_apoio.datas_funcionamento is 'Datas específicas (ou período) em que o PAP funciona. Vazio = nunca conta como ativo no contador/mapa de ativos.';

drop function if exists public.estatisticas_publicas();
create or replace function public.estatisticas_publicas()
returns table (
  peregrinos_ativos bigint,
  checkins_hoje bigint,
  checkins_total bigint,
  pontos_apoio_ativos bigint,
  peregrinacoes_concluidas bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.peregrinacoes where status = 'em_andamento'),
    (select count(*) from public.checkins where criado_em >= current_date),
    (select count(*) from public.checkins),
    (select count(*) from public.pontos_apoio
       where ativo = true and status_aprovacao = 'aprovado'
         and cardinality(datas_funcionamento) > 0 and current_date = any(datas_funcionamento)),
    (select count(*) from public.certificados);
$$;

grant execute on function public.estatisticas_publicas() to anon, authenticated;

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
  gerentes_pendentes bigint,
  peregrinos_cadastrados bigint,
  pap_cadastrados bigint,
  pap_ativos bigint,
  pap_pendentes bigint
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
    (select count(*) from public.pontos_apoio
       where ativo = true and status_aprovacao = 'aprovado'
         and cardinality(datas_funcionamento) > 0 and current_date = any(datas_funcionamento)),
    (select count(*) from public.pontos_risco),
    (select count(*) from public.gerentes_pap where status = 'pendente'),
    (select count(*) from public.profiles p
       where p.is_admin = false and p.is_agente = false
         and not exists (select 1 from public.gerentes_pap g where g.id = p.id)),
    (select count(*) from public.pontos_apoio),
    (select count(*) from public.pontos_apoio
       where aberto_agora = true and status_aprovacao = 'aprovado'
         and cardinality(datas_funcionamento) > 0 and current_date = any(datas_funcionamento)),
    (select count(*) from public.pontos_apoio where status_aprovacao = 'pendente');
end;
$$;

grant execute on function public.estatisticas_admin() to authenticated;

alter table public.pontos_risco add column if not exists sentido text check (sentido in ('sp', 'rj'));
comment on column public.pontos_risco.sentido is 'Sentido da via onde o risco fica: sp (sentido São Paulo / pista Norte) ou rj (sentido Rio / pista Sul).';

-- Guaratinguetá saiu da Rota Norte (não fica entre Roseira e Aparecida
-- nesse sentido) e entrou na Rota Sul, entre Cachoeira Paulista e Aparecida.
delete from public.pontos_checkin
where cidade = 'Guaratinguetá'
  and rota_id in (select id from public.rotas where slug = 'norte');

update public.pontos_checkin
set ordem = 11
where cidade = 'Aparecida' and ordem = 12
  and rota_id in (select id from public.rotas where slug = 'norte');

update public.pontos_checkin
set ordem = 6
where cidade = 'Aparecida' and ordem = 5
  and rota_id in (select id from public.rotas where slug = 'sul');

insert into public.pontos_checkin (rota_id, cidade, ordem, km_aproximado, latitude, longitude, descricao)
select r.id, 'Guaratinguetá', 5::smallint, 40.0, -22.8161, -45.1919, null
from public.rotas r
where r.slug = 'sul'
on conflict (rota_id, ordem) do nothing;

-- =====================================================================
-- MIGRATION 10 — Rodada 2: login/cadastro por e-mail (verificação por
-- código) e pré-cadastro de PAP a partir de uma base pública de 138
-- pontos reais (fonte: reportagem do G1), que um gerente pode
-- pesquisar e "reivindicar" ao cadastrar seu PAP, em vez de digitar
-- tudo do zero.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Rodovia (BR) do PAP / ponto de risco — hoje só existe o km e o
-- sentido da pista; a rodovia em si (116 é o padrão, 488 é a variante
-- que passa por Guaratinguetá) precisa ficar explícita.
-- ---------------------------------------------------------------------
alter table public.pontos_apoio
  add column if not exists br text not null default '116' check (br in ('116', '488'));

alter table public.pontos_risco
  add column if not exists br text not null default '116' check (br in ('116', '488'));

comment on column public.pontos_apoio.br is 'Rodovia: 116 (Presidente Dutra, padrão) ou 488 (variante).';
comment on column public.pontos_risco.br is 'Rodovia: 116 (Presidente Dutra, padrão) ou 488 (variante).';

-- ---------------------------------------------------------------------
-- Verificação de e-mail já cadastrado — usada pela nova tela de
-- entrada única (peregrino digita o e-mail primeiro; se já existe,
-- pede senha; se não existe, começa o cadastro). Função com
-- SECURITY DEFINER porque auth.users não é consultável direto pelo
-- cliente — o app decide expor essa checagem de propósito, para essa
-- experiência de "e-mail primeiro" que o usuário pediu (é uma escolha
-- deliberada de UX, diferente da proteção padrão do Supabase contra
-- enumeração de e-mails, que continua valendo em todos os outros
-- pontos, como o próprio signUp).
-- ---------------------------------------------------------------------
create or replace function public.email_ja_cadastrado(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from auth.users where lower(email) = lower(p_email)
  );
$$;

grant execute on function public.email_ja_cadastrado(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- PAPS PRÉ-CADASTRO — base pública de PAPs reais (nome, cidade, br,
-- km, sentido, período de funcionamento em texto livre) que um
-- gerente pode pesquisar e vincular ao cadastrar o dele, evitando
-- digitar tudo de novo. Quando vinculado, guarda quem reivindicou;
-- continua visível (mostrando que já foi reivindicado) para não sumir
-- da lista e alguém tentar cadastrar de novo.
-- ---------------------------------------------------------------------
create table if not exists public.paps_pre_cadastro (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  br text not null default '116' check (br in ('116', '488')),
  km numeric(6,1),
  sentido_pista text check (sentido_pista in ('sp', 'rj')),
  data_funcionamento_texto text,
  reivindicado_por uuid references public.gerentes_pap(id) on delete set null,
  reivindicado_em timestamptz,
  criado_em timestamptz not null default now()
);

comment on table public.paps_pre_cadastro is 'Base pública de PAPs reais (fonte: reportagem G1) para um gerente pesquisar e vincular ao cadastrar o seu, em vez de digitar do zero.';
comment on column public.paps_pre_cadastro.data_funcionamento_texto is 'Texto livre da fonte original (ex.: "06 a 08 de outubro"), sem ano definido — o gerente deve revisar/ajustar para o ano corrente da romaria ao vincular.';

alter table public.paps_pre_cadastro enable row level security;

-- Qualquer pessoa (mesmo sem login) pode ver a lista, para poder
-- pesquisar antes mesmo de se cadastrar como gerente.
drop policy if exists paps_pre_cadastro_select_all on public.paps_pre_cadastro;
create policy paps_pre_cadastro_select_all
  on public.paps_pre_cadastro for select
  using (true);

-- Sem insert/update/delete direto por RLS — tudo passa pela função
-- abaixo (reivindicar) ou por administrador via SQL.

-- Vincula o PAP (referência criada em pontos_apoio) a uma entrada do
-- pré-cadastro, marcando quem reivindicou. Bloqueia reivindicar de
-- novo uma entrada já reivindicada (evita corrida entre duas gerentes
-- clicando ao mesmo tempo).
create or replace function public.reivindicar_pap_pre_cadastro(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.gerentes_pap where id = auth.uid()) then
    raise exception 'apenas gerentes de PAP podem reivindicar um pré-cadastro';
  end if;

  update public.paps_pre_cadastro
  set reivindicado_por = auth.uid(), reivindicado_em = now()
  where id = p_id and reivindicado_por is null;

  if not found then
    raise exception 'este PAP já foi reivindicado por outro gerente ou não existe';
  end if;
end;
$$;

grant execute on function public.reivindicar_pap_pre_cadastro(uuid) to authenticated;

-- pontos_apoio.pre_cadastro_id — de qual entrada do pré-cadastro este
-- PAP veio (null quando cadastrado direto, sem usar a base pública).
alter table public.pontos_apoio
  add column if not exists pre_cadastro_id uuid references public.paps_pre_cadastro(id) on delete set null;

-- ---------------------------------------------------------------------
-- Seed — 138 PAPs reais extraídos da reportagem do G1 (documento
-- fornecido pelo usuário). Idempotente: só insere se a tabela ainda
-- estiver vazia, para não duplicar em uma nova execução da migration.
-- ---------------------------------------------------------------------
insert into public.paps_pre_cadastro (nome, cidade, br, km, sentido_pista, data_funcionamento_texto)
select * from (values
  ('Mãezinha do Céu', 'Guarulhos', '116', 216.0, 'sp', '06 a 08 de outubro'),
  ('Cantinho do Bem', 'Guarulhos', '116', 210.5, 'sp', '05 a 11 de outubro'),
  ('Família Silva', 'Guarulhos', '116', 208.0, 'rj', '04 a 10 de outubro'),
  ('Irmãos da Fé', 'Guarulhos', '116', 207.0, 'sp', '07 e 08 de outubro'),
  ('Centro Industrial Arujá', 'Arujá', '116', 203.5, 'sp', 'Sem informação de data'),
  ('Ballance', 'Arujá', '116', 201.8, 'rj', '08 e 09 de outubro'),
  ('Lions', 'Arujá', '116', 201.8, 'rj', '05 a 08 de outubro'),
  ('Família Oliveira & Amigos', 'Arujá', '116', 201.6, 'sp', '05 a 08 de outubro'),
  ('Amor em Ação Arujá', 'Arujá', '116', 199.0, 'rj', '07 e 08 de outubro'),
  ('Juntos na Superação', 'Arujá', '116', 199.0, 'sp', '06 a 09 de outubro'),
  ('Nossa Senhora Aparecida', 'Arujá', '116', 198.0, 'sp', '05 a 10 de outubro'),
  ('Somos da Imaculada', 'Santa Isabel', '116', 196.7, 'rj', '05 a 10 de outubro'),
  ('Comitiva de Aparecida', 'Santa Isabel', '116', 194.0, 'rj', '08 de outubro'),
  ('Anjos dos Romeiros', 'Santa Isabel', '116', 190.0, 'sp', '08 e 09 de outubro'),
  ('Nascimento da Fé', 'Santa Isabel', '116', 190.0, 'rj', '04 a 12 de outubro'),
  ('Rancho da Pamonha', 'Santa Isabel', '116', 189.0, 'rj', '05 a 11 de outubro'),
  ('Acolher Bem é Evangelizar', 'Santa Isabel', '116', 187.0, 'rj', '02 a 12 de outubro'),
  ('Maria: Advogada Nossa', 'Santa Isabel', '116', 184.0, 'rj', '07 a 09 de outubro'),
  ('Lions Guararema', 'Guararema', '116', 179.4, 'rj', '05 a 09 de outubro'),
  ('Com Sagradas Mãos', 'Guararema', '116', 177.0, 'sp', '08 de outubro'),
  ('Peregrinos de Aparecida 1', 'Guararema', '116', 177.0, 'sp', '08 de outubro'),
  ('Romaria Mãos Que Servem', 'Guararema', '116', 174.5, 'rj', '07 de outubro'),
  ('Romaria Fé na Estrada', 'Guararema', '116', 174.5, 'rj', '07 de outubro'),
  ('Mãos de Maria', 'Jacareí', '116', 169.0, 'rj', '08 de outubro'),
  ('Anjos e Acolhidos', 'Jacareí', '116', 165.0, 'sp', '07 a 10 de outubro'),
  ('Movidos Pela Fé 1', 'Jacareí', '116', 160.0, 'sp', '07 a 10 de outubro'),
  ('Romaria Com Fé Chegaremos', 'Jacareí', '116', 160.0, 'rj', 'Sem informação de data'),
  ('Ponto de Apoio aos Peregrinos de Aparecida', 'Jacareí', '116', 159.0, 'rj', '05 a 11 de outubro'),
  ('Amigos de São José', 'São José dos Campos', '116', 154.0, 'rj', '07 a 10 de outubro'),
  ('Amigos do Portuga', 'São José dos Campos', '116', 152.0, 'rj', '08 a 12 de outubro'),
  ('Centro de Apoio Bem Te Vi', 'São José dos Campos', '116', 150.0, 'rj', '02 a 11 de outubro'),
  ('Saúde e Fé Univ. Anhembi Morumbi', 'São José dos Campos', '116', 150.0, 'sp', '08 e 09 de outubro'),
  ('Lions Clube Internacional', 'São José dos Campos', '116', 149.1, 'rj', '08 a 10 de outubro'),
  ('Somos Todos Irmãos', 'São José dos Campos', '116', 148.6, 'rj', '10 de outubro'),
  ('Grupo de Escoteiros Cassiano Ricardo', 'São José dos Campos', '116', 148.0, 'sp', '09 a 11 de outubro'),
  ('Amigos - Em Agradecimento à Vida', 'São José dos Campos', '116', 145.0, 'rj', '07 a 12 de outubro'),
  ('São Peregrino', 'São José dos Campos', '116', 144.0, 'sp', '08 a 11 de outubro'),
  ('Tenda de Apoio aos Romeiros - Jardim Diamante', 'São José dos Campos', '116', 144.0, 'rj', '28 de setembro a 15 de outubro'),
  ('Comitiva de Aparecida', 'São José dos Campos', '116', 142.0, 'rj', '09 de outubro'),
  ('Do Mundo', 'São José dos Campos', '116', 142.0, 'rj', '09 a 12 de outubro'),
  ('Grupo de Apoio aos Peregrinos', 'São José dos Campos', '116', 140.0, 'rj', '09 de outubro'),
  ('Com Sagradas Mãos', 'São José dos Campos', '116', 140.0, 'rj', '09 de outubro'),
  ('Caminho dos Irmãos de Fé', 'São José dos Campos', '116', 140.0, 'rj', '09 a 11 de outubro'),
  ('Mãos que servem', 'São José dos Campos', '116', 138.0, 'rj', '08 de outubro'),
  ('Romaria Fé na Estrada', 'São José dos Campos', '116', 138.0, 'rj', '08 de outubro'),
  ('S.O.S Risos', 'São José dos Campos', '116', 137.0, 'rj', '08 a 11 de outubro'),
  ('Eugênio de Melo', 'São José dos Campos', '116', 136.5, 'rj', '07 a 11 de outubro'),
  ('Maria Passa na Frente', 'São José dos Campos', '116', 136.0, 'sp', '09 a 12 de outubro'),
  ('Unidos por Nossa Senhora', 'São José dos Campos', '116', 135.0, 'rj', '09 a 12 de outubro'),
  ('Anjos e Acolhidos 2', 'Caçapava', '116', 134.0, 'rj', '10 e 11 de outubro'),
  ('Perseverantes na Fé', 'Caçapava', '116', 133.0, 'sp', '09 a 11 de outubro'),
  ('Filhos de Maria', 'Caçapava', '116', 133.0, 'sp', '06 a 12 de outubro'),
  ('Silvia e Família', 'Caçapava', '116', 132.0, 'rj', '08 a 11 de outubro'),
  ('Amigos do Inocop', 'Caçapava', '116', 130.0, 'rj', '10 de outubro'),
  ('Ponto de Apoio aos Romeiros', 'Caçapava', '116', 129.0, 'rj', '08 a 12 de outubro'),
  ('Pássaro Marrom', 'Caçapava', '116', 129.0, 'sp', '10 de outubro'),
  ('Amigos da Fé 3', 'Caçapava', '116', 128.0, 'rj', '09 e 10 de outubro'),
  ('Prova de Amor', 'Caçapava', '116', 126.6, 'sp', '08 a 11 de outubro'),
  ('Amigos da Fé (ao lado PRF)', 'Caçapava', '116', 126.5, 'rj', '07 a 12 de outubro'),
  ('Família Romeiros', 'Caçapava', '116', 125.0, 'rj', 'Sem informação de data'),
  ('Amigos da Val', 'Caçapava', '116', 125.0, 'rj', '09 a 11 de outubro'),
  ('Dos Amigos', 'Caçapava', '116', 122.0, 'rj', '02 a 11 de outubro'),
  ('Amigos Pela Fé', 'Caçapava', '116', 118.0, 'rj', '08 a 12 de outubro'),
  ('IBG (Igreja Batista)', 'Taubaté', '116', 117.0, 'sp', 'Sem informação de data'),
  ('Estação do Peregrino', 'Taubaté', '116', 117.0, 'rj', '10 e 11 de outubro'),
  ('Com Sagradas Mãos', 'Taubaté', '116', 115.5, 'rj', '10 de outubro'),
  ('Romaria Com Fé Chegaremos', 'Taubaté', '116', 115.0, 'rj', '11 de outubro'),
  ('Sucesso e Alegria', 'Taubaté', '116', 115.0, 'rj', '09 a 11 de outubro'),
  ('Filhos de Maria', 'Taubaté', '116', 114.0, 'sp', '09 a 12 de outubro'),
  ('União das Pensionistas PMESP', 'Taubaté', '116', 113.0, 'sp', '08 a 12 de outubro'),
  ('Unidos Pela Fé', 'Taubaté', '116', 113.0, 'rj', '02 a 12 de outubro'),
  ('Polenta Solidária', 'Taubaté', '116', 113.0, 'rj', '10 de outubro'),
  ('Estação Decolores', 'Taubaté', '116', 111.0, 'rj', '10 e 11 de outubro'),
  ('Unidos Pelo Amor e Pela Fé', 'Taubaté', '116', 110.0, 'rj', '08 a 12 de outubro'),
  ('Terço dos Homens', 'Taubaté', '116', 108.5, 'rj', '04 a 12 de outubro'),
  ('Mãos que Servem', 'Taubaté', '116', 108.0, 'rj', '09 de outubro'),
  ('Romaria Fé na Estrada', 'Taubaté', '116', 108.0, 'rj', '09 de outubro'),
  ('Abutres Moto Clube', 'Taubaté', '116', 108.0, 'rj', '05 a 12 de outubro'),
  ('Nossa Senhora de Nazaré', 'Taubaté', '116', 107.0, 'rj', '09 a 12 de outubro'),
  ('Anjo Pietra', 'Taubaté', '116', 107.0, 'rj', 'Sem informação de data'),
  ('Madre Tereza de Calcutá', 'Taubaté', '116', 107.0, 'rj', '11 e 12 de outubro'),
  ('Fé e Saúde', 'Taubaté', '116', 107.0, 'rj', '10 e 11 de outubro'),
  ('Ao Pai e por Maria', 'Taubaté', '116', 107.0, 'rj', '09 a 11 de outubro'),
  ('Sentinelas de Nossa Senhora Aparecida', 'Taubaté', '116', 107.0, 'rj', '06 a 11 de outubro'),
  ('Vó Jandira', 'Taubaté', '116', 107.0, 'sp', '08 a 12 de outubro'),
  ('Estação São Miguel', 'Pindamonhangaba', '116', 104.0, 'rj', 'Sem informação de data'),
  ('Esperança', 'Pindamonhangaba', '116', 102.5, 'rj', '09 a 12 de outubro'),
  ('Villar e Amigos', 'Pindamonhangaba', '116', 101.0, 'rj', '08 a 12 de outubro'),
  ('Amigos da Fé Interlagos', 'Pindamonhangaba', '116', 101.0, 'rj', '08 a 12 de outubro'),
  ('Manto Azul', 'Pindamonhangaba', '116', 101.0, 'rj', '08 a 11 de outubro'),
  ('Colo de Mãe', 'Pindamonhangaba', '116', 101.0, 'rj', '11 e 12 de outubro'),
  ('Comitiva de Aparecida', 'Pindamonhangaba', '116', 101.0, 'rj', '10 de outubro'),
  ('Gueri Gueri, Enrolados nas Trilhas', 'Pindamonhangaba', '116', 100.0, 'sp', 'Sem informação de data'),
  ('Amigos da Fé SP', 'Pindamonhangaba', '116', 99.0, 'sp', '08 a 12 de outubro'),
  ('Imaculado Coração de Maria', 'Pindamonhangaba', '116', 98.0, 'sp', '11 de outubro'),
  ('Amigos em Oração', 'Pindamonhangaba', '116', 97.8, 'sp', '10 a 12 de outubro'),
  ('Maria Passa à Frente', 'Pindamonhangaba', '116', 96.0, 'sp', '03 de outubro'),
  ('Coração Valente', 'Pindamonhangaba', '116', 96.0, 'sp', '09 a 12 de outubro'),
  ('Nossa Senhora Rainha do Brasil', 'Pindamonhangaba', '116', 96.0, 'sp', '08 a 11 de outubro'),
  ('Filhos de Aparecida', 'Pindamonhangaba', '116', 94.0, 'sp', '08 a 11 de outubro'),
  ('Aldeia Estelar', 'Pindamonhangaba', '116', 93.0, 'sp', '10 de outubro'),
  ('Café Romeiro', 'Pindamonhangaba', '116', 92.0, 'sp', '10 de outubro'),
  ('Tenda do Acolhimento', 'Pindamonhangaba', '116', 92.0, 'sp', '09 a 11 de outubro'),
  ('Igreja da Cidade', 'Pindamonhangaba', '116', 92.0, 'sp', '12 de outubro'),
  ('Amigos da Fé 3', 'Pindamonhangaba', '116', 88.0, 'sp', '11 de outubro'),
  ('Peregrinos de Aparecida 2', 'Pindamonhangaba', '116', 87.0, 'sp', '10 e 11 de outubro'),
  ('Mãe Peregrina', 'Pindamonhangaba', '116', 87.0, 'sp', '10 a 12 de outubro'),
  ('Aliança pelos Romeiros', 'Pindamonhangaba', '116', 85.5, 'sp', '10 e 11 de outubro'),
  ('Amigos da Fé 3', 'Pindamonhangaba', '116', 85.5, 'sp', '12 de outubro'),
  ('Arco-Íris', 'Roseira', '116', 82.0, 'rj', '09 a 12 de outubro'),
  ('Unifatea', 'Roseira', '116', 82.0, 'rj', '10 e 11 de outubro'),
  ('Luz no Caminho', 'Roseira', '116', 82.0, 'sp', '11 de outubro'),
  ('Caminho dos Milagres', 'Roseira', '116', 81.0, 'sp', '11 e 12 de outubro'),
  ('Unidos Pela Fé', 'Roseira', '116', 81.0, 'sp', '10 a 12 de outubro'),
  ('Igreja Nova Vida', 'Roseira', '116', 80.0, 'sp', '10 e 11 de outubro'),
  ('Pássaro Marrom', 'Roseira', '116', 79.0, 'sp', '10 e 11 de outubro'),
  ('Tenda de Apoio Mãe Aparecida', 'Roseira', '116', 79.0, 'sp', '11 de outubro'),
  ('Amigos na Vida e Unidos Pela Fé', 'Roseira', '116', 79.0, 'sp', '11 e 12 de outubro'),
  ('União', 'Roseira', '116', 79.0, 'sp', '11 e 12 de outubro'),
  ('Polenta Solidária', 'Roseira', '116', 79.0, 'sp', '11 de outubro'),
  ('Bom Fran', 'Aparecida', '116', 75.0, 'sp', '11 de outubro'),
  ('Refúgio da Imaculada', 'Aparecida', '116', 75.0, 'sp', '11 e 12 de outubro'),
  ('Voluntários Pela Fé', 'Aparecida', '116', 75.0, 'sp', '10 a 12 de outubro'),
  ('Ektor', 'Aparecida', '116', 75.0, 'sp', '11 e 12 de outubro'),
  ('Mãos que Servem', 'Aparecida', '116', 75.0, 'sp', '10 de outubro'),
  ('Romaria Fé na Estrada', 'Aparecida', '116', 75.0, 'sp', '10 de outubro'),
  ('Família Ferreira-Madinha', 'Aparecida', '116', 74.5, 'sp', '03 a 12 de outubro'),
  ('Comitiva de Aparecida', 'Aparecida', '116', 74.5, 'sp', '11 de outubro'),
  ('Coração de Mãe Sempre Cabe Mais Um', 'Aparecida', '116', 72.0, 'sp', '10 a 12 de outubro'),
  ('Amigos na Fé', 'Aparecida', '488', null, 'sp', '11 e 12 de outubro'),
  ('Casa da Mãe', 'Aparecida', '488', null, 'sp', '09 a 12 de outubro'),
  ('Tenda Amigos dos Irmãos Peregrinos', 'Aparecida', '488', null, 'sp', '02 a 18 de outubro'),
  ('Rosa Azul', 'Guaratinguetá', '116', 59.0, 'sp', 'Sem informação de data'),
  ('Lion Canas', 'Canas', '116', 47.0, 'rj', '11 e 12 de outubro'),
  ('Pousada São João Batista', 'Cachoeira Paulista', '116', 38.0, 'sp', 'Sem informação de data'),
  ('Unidos pela Fé', 'Queluz', '116', 9.0, 'rj', '07 a 12 de outubro'),
  ('Anjos da Estrada', 'Apoio Móvel (Itinerante)', '116', null, 'rj', '09 a 12 de outubro'),
  ('Parada da Relíquia', 'Rio de Janeiro - Engenheiro Passos', '116', 336.0, 'rj', '08 a 10 de outubro')) as v(nome, cidade, br, km, sentido_pista, data_funcionamento_texto)
where not exists (select 1 from public.paps_pre_cadastro limit 1);

-- FIM DA MIGRATION 10
-- =====================================================================
-- MIGRATION 11 — Rodada 4: Planejar peregrinação (cidade de início e
-- tamanho do grupo) e Informar Sinistro ou Suspeita (categorização e
-- publicação automática por tempo)
-- =====================================================================

-- Peregrinações: cidade de início na Dutra (usada para restringir os
-- check-ins mostrados ao trecho realmente percorrido) e tamanho do grupo.
alter table public.peregrinacoes add column if not exists cidade_inicio text;
alter table public.peregrinacoes add column if not exists tamanho_grupo int;

-- Riscos informados: categoria do relato (sinistro/suspeita/chuva/outros) —
-- define as opções de "tipo" no app e entra na regra de publicação abaixo
-- (chuva publica na hora; as demais aguardam a administração por 30min).
alter table public.riscos_informados add column if not exists categoria text not null default 'sinistro' check (categoria in ('sinistro', 'suspeita', 'chuva', 'outros'));

-- Visibilidade pública por tempo, sem depender de nenhum job/cron:
-- - "chuva" fica visível assim que enviada;
-- - as demais categorias só ficam visíveis 30 minutos depois de enviadas,
--   caso a administração não tenha revisado antes;
-- - tudo que não foi confirmado pela administração some do público depois
--   de 1 hora (continua visível para o autor e para a administração, pela
--   política já existente "riscos_informados_select_own_ou_admin");
-- - uma vez confirmado ("aprovado") pela administração, fica visível sem
--   prazo de expiração e perde a marca de "não confirmado" no app.
drop policy if exists "riscos_informados_select_publicos" on public.riscos_informados;
create policy "riscos_informados_select_publicos" on public.riscos_informados for select
  using (
    status = 'aprovado'
    or (
      status = 'pendente'
      and (categoria = 'chuva' or criado_em <= now() - interval '30 minutes')
      and criado_em > now() - interval '1 hour'
    )
  );

-- FIM DA MIGRATION 11
-- =====================================================================
-- MIGRATION 12 — Rodada 5: Romaria Plus (compra paga via Mercado Pago)
-- =====================================================================

-- Compras da "Romaria Plus" — arte personalizada paga (R$14,90), vinculada
-- a um certificado já emitido (a peregrinação precisa estar concluída e
-- certificada para ter dados reais para a arte). Todo insert/update nesta
-- tabela é feito pelo servidor com a service role key (rotas
-- /api/mercadopago/...) — nunca diretamente pelo cliente, para que preço e
-- status de pagamento nunca dependam de nada que o navegador envie.
create table if not exists public.compras_romaria_plus (
  id uuid primary key default gen_random_uuid(),
  certificado_id uuid not null references public.certificados(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  valor_centavos int not null default 1490,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado', 'estornado')),
  mp_preference_id text,
  mp_payment_id text,
  criado_em timestamptz not null default now(),
  pago_em timestamptz
);

create index if not exists idx_compras_romaria_plus_certificado on public.compras_romaria_plus(certificado_id);
create index if not exists idx_compras_romaria_plus_user on public.compras_romaria_plus(user_id);

alter table public.compras_romaria_plus enable row level security;

-- O próprio usuário só pode LER as próprias compras (para acompanhar o
-- status e liberar a arte quando pago = true). Sem policy de insert/update/
-- delete para authenticated: essas operações só acontecem via service role,
-- que ignora RLS.
drop policy if exists "compras_romaria_plus_select_own" on public.compras_romaria_plus;
create policy "compras_romaria_plus_select_own" on public.compras_romaria_plus for select to authenticated
  using (user_id = auth.uid());

-- FIM DA MIGRATION 12
-- =====================================================================
-- MIGRATION 13 — Rodada 6: Painel admin (PAP com foto e ponto de
-- referência, locais de risco com ponto de referência, QR code por PAP)
-- =====================================================================

-- PAP: foto do local (bucket de storage abaixo) e ponto de referência em
-- texto livre (ex.: "em frente ao posto Shell"), preenchidos no cadastro
-- pelo gerente de PAP ou pela administração.
alter table public.pontos_apoio add column if not exists foto_url text;
alter table public.pontos_apoio add column if not exists ponto_referencia text;

-- Locais de risco (cadastro permanente da administração): mesmo campo de
-- ponto de referência, para ajudar o peregrino a identificar o trecho.
alter table public.pontos_risco add column if not exists ponto_referencia text;

-- ---------------------------------------------------------------------
-- STORAGE — bucket público para fotos de PAP
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pap-fotos', 'pap-fotos', true)
on conflict (id) do nothing;

drop policy if exists "pap_fotos_select_all" on storage.objects;
create policy "pap_fotos_select_all" on storage.objects for select
  using (bucket_id = 'pap-fotos');

drop policy if exists "pap_fotos_insert_own" on storage.objects;
create policy "pap_fotos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'pap-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pap_fotos_update_own" on storage.objects;
create policy "pap_fotos_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'pap-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pap_fotos_delete_own" on storage.objects;
create policy "pap_fotos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'pap-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- FIM DA MIGRATION 13
-- =====================================================================
-- MIGRATION 14 — Rodada 7: Perfil ("Falar com o desenvolvedor")
-- =====================================================================

-- Mensagens de peregrinos/gerentes de PAP para a administração — um canal
-- simples dentro do próprio app, sem depender de e-mail/SMS: o usuário
-- escreve pelo perfil, a administração lê e responde pelo painel admin, e a
-- resposta aparece de volta para quem enviou na mesma tela.
create table if not exists public.mensagens_contato (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto text,
  mensagem text not null,
  status text not null default 'novo' check (status in ('novo', 'lida', 'respondida')),
  resposta_admin text,
  respondido_por uuid references auth.users(id) on delete set null,
  respondido_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists idx_mensagens_contato_user on public.mensagens_contato(user_id);

alter table public.mensagens_contato enable row level security;

drop policy if exists "mensagens_contato_insert_own" on public.mensagens_contato;
create policy "mensagens_contato_insert_own" on public.mensagens_contato for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "mensagens_contato_select_own_ou_admin" on public.mensagens_contato;
create policy "mensagens_contato_select_own_ou_admin" on public.mensagens_contato for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "mensagens_contato_update_admin" on public.mensagens_contato;
create policy "mensagens_contato_update_admin" on public.mensagens_contato for update to authenticated
  using (public.is_admin());

-- FIM DA MIGRATION 14

-- =====================================================================
-- MIGRATION 15 — Rodada 8:
-- 1) Impede peregrinação duplicada: no máximo uma peregrinação ativa
--    (planejada ou em andamento) por usuário, garantido por índice único
--    (além da checagem já feita no app antes de inserir).
-- 2) Pontos de risco: coluna de foto, para o admin ilustrar o local.
-- =====================================================================

-- 1a) Antes de criar o índice único, "limpa" eventuais duplicatas que já
-- possam existir (mantém a mais relevante — em andamento mais recente,
-- senão a planejada mais recente — e cancela as demais).
with rankeadas as (
  select id,
         row_number() over (
           partition by user_id
           order by (status = 'em_andamento') desc, criado_em desc
         ) as rn
  from public.peregrinacoes
  where status in ('planejada', 'em_andamento')
)
update public.peregrinacoes
set status = 'cancelada'
where id in (select id from rankeadas where rn > 1);

-- 1b) Índice único parcial: garante, a partir de agora, que nunca haja mais
-- de uma peregrinação ativa por usuário.
create unique index if not exists peregrinacoes_ativa_unica_por_usuario
  on public.peregrinacoes (user_id)
  where status in ('planejada', 'em_andamento');

-- 2) Foto do ponto de risco (mesmo padrão já usado para foto do PAP).
alter table public.pontos_risco add column if not exists foto_url text;

insert into storage.buckets (id, name, public)
values ('risco-fotos', 'risco-fotos', true)
on conflict (id) do nothing;

drop policy if exists "risco_fotos_select_all" on storage.objects;
create policy "risco_fotos_select_all" on storage.objects for select
  using (bucket_id = 'risco-fotos');

drop policy if exists "risco_fotos_insert_admin_ou_agente" on storage.objects;
create policy "risco_fotos_insert_admin_ou_agente" on storage.objects for insert to authenticated
  with check (bucket_id = 'risco-fotos' and (public.is_admin() or public.is_agente()));

drop policy if exists "risco_fotos_update_admin_ou_agente" on storage.objects;
create policy "risco_fotos_update_admin_ou_agente" on storage.objects for update to authenticated
  using (bucket_id = 'risco-fotos' and (public.is_admin() or public.is_agente()));

drop policy if exists "risco_fotos_delete_admin_ou_agente" on storage.objects;
create policy "risco_fotos_delete_admin_ou_agente" on storage.objects for delete to authenticated
  using (bucket_id = 'risco-fotos' and (public.is_admin() or public.is_agente()));

-- FIM DA MIGRATION 15

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
