-- MIGRATION 25 — Termos de Uso / Política de Privacidade (registro de
-- aceite) e reforço de segurança nos buckets de upload de foto.
-- ---------------------------------------------------------------------

-- Registro de aceite dos Termos de Uso / Política de Privacidade, tanto
-- para peregrino (profiles) quanto para gerente de PAP (gerentes_pap).
-- Guardamos a VERSÃO aceita (não só um booleano) para permitir, no futuro,
-- publicar uma nova versão dos termos e detectar quem só aceitou uma
-- versão antiga (o app pode então pedir para aceitar de novo).
alter table public.profiles add column if not exists termos_aceitos_versao text;
alter table public.profiles add column if not exists termos_aceitos_em timestamptz;
alter table public.gerentes_pap add column if not exists termos_aceitos_versao text;
alter table public.gerentes_pap add column if not exists termos_aceitos_em timestamptz;

comment on column public.profiles.termos_aceitos_versao is 'Versão dos Termos de Uso/Política de Privacidade aceita por último (ver TERMOS_VERSAO_ATUAL em src/lib/constants.ts). Nulo = nunca aceitou.';
comment on column public.profiles.termos_aceitos_em is 'Data/hora do aceite — carimbada pelo servidor (registrar_aceite_termos), nunca pelo próprio cliente, para não poder ser forjada.';

-- Registra o aceite dos termos pela conta logada — a versão aceita é
-- decidida AQUI dentro (v_versao), nunca recebida do cliente, para que
-- ninguém possa forjar ter aceitado uma versão diferente da atual. Cria a
-- linha em `profiles` se ainda não existir (caso do peregrino recém-
-- cadastrado, cujo perfil completo só é preenchido depois, em /perfil) —
-- para isso precisa do nome informado no próprio cadastro. Se a conta já
-- é gerente de PAP (linha em gerentes_pap), atualiza o aceite lá também
-- (uma conta pode ser as duas coisas ao mesmo tempo, como já é possível
-- desde a Rodada 14).
create or replace function public.registrar_aceite_termos(p_nome_completo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao text := '1.0 (16/09/2026)';
begin
  if auth.uid() is null then
    raise exception 'é preciso estar logado para aceitar os termos';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    update public.profiles
      set termos_aceitos_versao = v_versao, termos_aceitos_em = now()
      where id = auth.uid();
  elsif p_nome_completo is not null and length(trim(p_nome_completo)) > 0 then
    insert into public.profiles (id, nome_completo, termos_aceitos_versao, termos_aceitos_em)
    values (auth.uid(), trim(p_nome_completo), v_versao, now());
  end if;

  if exists (select 1 from public.gerentes_pap where id = auth.uid()) then
    update public.gerentes_pap
      set termos_aceitos_versao = v_versao, termos_aceitos_em = now()
      where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.registrar_aceite_termos(text) to authenticated;

-- Reforço de segurança: os 4 buckets de foto criados até aqui (avatars,
-- pap-fotos, risco-fotos, romaria-plus-fotos) não tinham limite de
-- tamanho nem restrição de tipo de arquivo no próprio bucket — a
-- validação de até então (ex.: "arquivo maior que 4MB") acontecia só no
-- navegador (JavaScript), o que qualquer pessoa pode contornar chamando a
-- API de upload diretamente com seu próprio token, sem passar pelo app.
-- Passa a valer também no servidor (Supabase Storage), como segunda
-- camada real de proteção contra upload de arquivo enorme ou de um tipo
-- que não é imagem.
update storage.buckets
set file_size_limit = 6 * 1024 * 1024, -- 6MB (folga sobre os 3-4MB checados no navegador)
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id in ('avatars', 'pap-fotos', 'risco-fotos', 'romaria-plus-fotos');

-- FIM DA MIGRATION 25
