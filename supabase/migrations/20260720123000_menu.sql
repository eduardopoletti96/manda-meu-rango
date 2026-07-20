-- 1.2 — Cardápio: categorias (quadros do grid) e itens.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_unique_name_per_restaurant unique (restaurant_id, name)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Cobre tanto o filtro por restaurante quanto a ordenação do grid.
create index categories_restaurant_sort_idx
  on public.categories (restaurant_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  -- denormalizado a partir de categories: as políticas de RLS filtram por
  -- restaurant_id sem precisar de join, e o índice abaixo serve a vitrine.
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  image_url text,
  price numeric(10, 2) not null check (price >= 0),
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create index menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index menu_items_category_sort_idx on public.menu_items (category_id, sort_order);

-- Como restaurant_id é denormalizado, ele pode divergir do restaurante da
-- categoria em um update descuidado — o que vazaria itens entre tenants na
-- RLS. Esta trigger garante a coerência no banco, não só na aplicação.
create or replace function public.enforce_menu_item_restaurant()
returns trigger
language plpgsql
as $$
declare
  category_restaurant_id uuid;
begin
  select restaurant_id into category_restaurant_id
  from public.categories
  where id = new.category_id;

  if category_restaurant_id is null then
    raise exception 'Categoria % nao encontrada', new.category_id;
  end if;

  if category_restaurant_id <> new.restaurant_id then
    raise exception 'menu_items.restaurant_id (%) diverge do restaurante da categoria (%)',
      new.restaurant_id, category_restaurant_id;
  end if;

  return new;
end;
$$;

create trigger menu_items_enforce_restaurant
  before insert or update of restaurant_id, category_id on public.menu_items
  for each row execute function public.enforce_menu_item_restaurant();

comment on table public.categories is 'Categorias do cardapio; renderizadas como quadros no grid da vitrine.';
comment on table public.menu_items is 'Itens do cardapio dentro de uma categoria.';
comment on column public.menu_items.restaurant_id is 'Denormalizado da categoria para simplificar RLS; coerencia garantida por trigger.';
comment on column public.menu_items.is_available is 'Item indisponivel (esgotado) nao aparece para o cliente.';
