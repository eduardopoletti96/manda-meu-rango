-- 1.6 — Buckets de Storage para as imagens do restaurante e do cardápio.
--
-- Convenção de caminho: <restaurant_id>/<arquivo>. A primeira pasta é o id do
-- restaurante, e é ela que as políticas usam para decidir quem pode escrever —
-- por isso o upload precisa sempre respeitar esse prefixo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos',      'logos',      true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('covers',     'covers',     true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('categories', 'categories', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('items',      'items',      true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Extrai o restaurante dono do objeto a partir da primeira pasta do caminho.
-- O cast direto para uuid levantaria exceção num caminho fora da convenção
-- (ex.: "avulso.png"), fazendo a query falhar em vez de simplesmente negar —
-- por isso validamos o formato antes e devolvemos NULL quando não casa.
create or replace function public.storage_object_restaurant_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[1] ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

-- Leitura pública: a vitrine é aberta e serve as imagens direto do CDN.
create policy storage_public_read on storage.objects
  for select using (bucket_id in ('logos', 'covers', 'categories', 'items'));

-- Escrita restrita ao restaurante dono da pasta. NULL vindo do helper faz
-- is_restaurant_member receber NULL e a condição não casar — acesso negado.
create policy storage_member_insert on storage.objects
  for insert to authenticated with check (
    bucket_id in ('logos', 'covers', 'categories', 'items')
    and public.is_restaurant_member(public.storage_object_restaurant_id(name))
  );

create policy storage_member_update on storage.objects
  for update to authenticated using (
    bucket_id in ('logos', 'covers', 'categories', 'items')
    and public.is_restaurant_member(public.storage_object_restaurant_id(name))
  );

create policy storage_member_delete on storage.objects
  for delete to authenticated using (
    bucket_id in ('logos', 'covers', 'categories', 'items')
    and public.is_restaurant_member(public.storage_object_restaurant_id(name))
  );
