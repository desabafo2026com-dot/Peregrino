-- MIGRATION 23 — Rodada 17: dois modelos novos da Romaria Plus (Painel
-- Flutuante e Moldura Dourada) e posição/tamanho ajustáveis do texto
-- =====================================================================

-- Dois modelos novos além de "classico"/"destaque": "painel" (foto em
-- destaque total, com um painel de texto flutuante que o peregrino pode
-- arrastar) e "moldura" (moldura dourada ao redor de toda a arte, foto e
-- texto sempre em áreas separadas, nunca sobrepostos).
alter table public.compras_romaria_plus
  drop constraint if exists compras_romaria_plus_modelo_check;
alter table public.compras_romaria_plus
  add constraint compras_romaria_plus_modelo_check
  check (modelo in ('classico', 'destaque', 'painel', 'moldura'));

-- Posição (x/y, centro do painel em % da arte) e tamanho (escala, % do
-- padrão) do painel de texto escolhidos pelo peregrino nos modelos que
-- sobrepõem texto à foto ("classico"/"painel") — resolve o pedido de poder
-- mover/redimensionar o texto para não cobrir pessoas na foto. Nula
-- significa "usar a posição padrão do modelo" (compras antigas, ou modelos
-- "destaque"/"moldura", que nunca sobrepõem texto à foto).
alter table public.compras_romaria_plus add column if not exists ajuste_overlay jsonb;

comment on column public.compras_romaria_plus.ajuste_overlay is 'Posição/tamanho do painel de texto sobre a foto ({x,y,escala}), só usado nos modelos "classico"/"painel" — null usa a posição padrão do modelo (Rodada 17).';

-- Recriada com o novo parâmetro opcional p_ajuste_overlay — precisa
-- dropar antes porque adicionar um parâmetro no meio/fim muda a
-- assinatura da função (create or replace exige os mesmos parâmetros de
-- entrada já existentes, na mesma ordem, para só então poder acrescentar
-- novos parâmetros com valor padrão no final; como não temos certeza da
-- versão exata já publicada, o drop+create evita qualquer ambiguidade de
-- sobrecarga de função no PostgREST).
drop function if exists public.salvar_foto_romaria_plus(uuid, text, text);

create function public.salvar_foto_romaria_plus(
  p_compra_id uuid,
  p_foto_url text,
  p_modelo text,
  p_ajuste_overlay jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.compras_romaria_plus
  set foto_url = p_foto_url, modelo = p_modelo, ajuste_overlay = p_ajuste_overlay
  where id = p_compra_id and user_id = auth.uid() and status = 'pago';

  if not found then
    raise exception 'compra não encontrada, não paga, ou não pertence a este usuário';
  end if;
end;
$$;

grant execute on function public.salvar_foto_romaria_plus(uuid, text, text, jsonb) to authenticated;

-- FIM DA MIGRATION 23
