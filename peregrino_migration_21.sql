-- =====================================================================
-- MIGRATION 21 — Rodada 15: certificado grátis simples (separado do
-- "Certificado Plus"), fotos da Romaria Plus persistidas por ano
-- =====================================================================

-- Até agora a foto escolhida para a arte da Romaria Plus só existia na
-- memória do navegador (nunca era enviada a lugar nenhum) — assim que a
-- pessoa fechava a aba, a foto sumia, e a administração não tinha como
-- ver o que foi gerado. `ano` trava a edição de foto ao ano da própria
-- compra (o mesmo peregrino pode comprar a Romaria Plus em anos
-- diferentes, cada compra com sua própria foto/modelo, nunca misturados).
alter table public.compras_romaria_plus add column if not exists ano int;
alter table public.compras_romaria_plus add column if not exists foto_url text;
alter table public.compras_romaria_plus add column if not exists modelo text check (modelo in ('classico', 'destaque'));

comment on column public.compras_romaria_plus.ano is 'Ano de conclusão da peregrinação do certificado vinculado (ver certificados.data_fim/emitido_em) — trava a edição da foto a este ano específico.';
comment on column public.compras_romaria_plus.foto_url is 'Foto escolhida pelo peregrino para a arte da Romaria Plus (bucket romaria-plus-fotos) — permite à administração ver, baixar ou substituir.';
comment on column public.compras_romaria_plus.modelo is 'Modelo de arte escolhido ("classico" ou "destaque"), salvo junto com a foto para reabrir a mesma prévia depois.';

-- Preenche o ano das compras já existentes, a partir do certificado.
update public.compras_romaria_plus cp
set ano = extract(year from coalesce(c.data_fim, c.emitido_em))::int
from public.certificados c
where c.id = cp.certificado_id and cp.ano is null;

-- Deixa o próprio peregrino salvar SÓ a foto/modelo da compra que ele
-- mesmo pagou (nunca de outra pessoa, nunca de uma compra ainda não paga)
-- sem abrir uma política de update ampla na tabela de pagamentos.
create or replace function public.salvar_foto_romaria_plus(p_compra_id uuid, p_foto_url text, p_modelo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.compras_romaria_plus
  set foto_url = p_foto_url, modelo = p_modelo
  where id = p_compra_id and user_id = auth.uid() and status = 'pago';

  if not found then
    raise exception 'compra não encontrada, não paga, ou não pertence a este usuário';
  end if;
end;
$$;

grant execute on function public.salvar_foto_romaria_plus(uuid, text, text) to authenticated;

-- Administração passa a poder listar as compras pagas (para ver/baixar as
-- fotos) e, se precisar substituir uma foto inadequada, atualizar
-- diretamente — única exceção de update direto nesta tabela, restrita a
-- admin (toda escrita normal continua só pelo servidor/service role).
drop policy if exists compras_romaria_plus_select_admin on public.compras_romaria_plus;
create policy compras_romaria_plus_select_admin
  on public.compras_romaria_plus for select to authenticated
  using (public.is_admin());

drop policy if exists compras_romaria_plus_update_admin on public.compras_romaria_plus;
create policy compras_romaria_plus_update_admin
  on public.compras_romaria_plus for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket para as fotos da Romaria Plus — mesmo padrão já usado para
-- pap-fotos/risco-fotos: público para leitura (a própria arte gerada já é
-- pensada para ser compartilhada), gravável pelo dono (pasta = seu próprio
-- user_id) ou pela administração (para substituir uma foto, se preciso).
insert into storage.buckets (id, name, public)
values ('romaria-plus-fotos', 'romaria-plus-fotos', true)
on conflict (id) do nothing;

drop policy if exists "romaria_plus_fotos_select_all" on storage.objects;
create policy "romaria_plus_fotos_select_all" on storage.objects for select
  using (bucket_id = 'romaria-plus-fotos');

drop policy if exists "romaria_plus_fotos_insert_own_ou_admin" on storage.objects;
create policy "romaria_plus_fotos_insert_own_ou_admin" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'romaria-plus-fotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "romaria_plus_fotos_update_own_ou_admin" on storage.objects;
create policy "romaria_plus_fotos_update_own_ou_admin" on storage.objects for update to authenticated
  using (
    bucket_id = 'romaria-plus-fotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "romaria_plus_fotos_delete_own_ou_admin" on storage.objects;
create policy "romaria_plus_fotos_delete_own_ou_admin" on storage.objects for delete to authenticated
  using (
    bucket_id = 'romaria-plus-fotos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- FIM DA MIGRATION 21
