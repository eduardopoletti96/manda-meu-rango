-- 1.1 — Restaurantes, usuários do restaurante e horários de funcionamento.
-- Base do multi-tenant: todo dado do domínio pendura em restaurants.

-- Mantém updated_at coerente sem depender da aplicação. Reutilizada
-- pelas migrations seguintes (categories, menu_items, orders).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.restaurant_role as enum ('owner', 'manager', 'staff');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  email text,

  -- endereço
  zip_code text,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  min_order_value numeric(10, 2) not null default 0 check (min_order_value >= 0),
  avg_prep_time_minutes int not null default 30 check (avg_prep_time_minutes > 0),

  stripe_account_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- o slug vive na URL pública (/:slug), então restringimos ao que é
  -- seguro e legível: minúsculas, dígitos e hífens não adjacentes.
  constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint restaurants_slug_length check (char_length(slug) between 3 and 63),
  -- pelo menos um modo de operação precisa estar ativo
  constraint restaurants_fulfillment_present check (delivery_enabled or pickup_enabled)
);

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- Vínculo entre contas do Supabase Auth e restaurantes. Um usuário pode
-- pertencer a mais de um restaurante, mas com um único papel em cada.
create table public.restaurant_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.restaurant_role not null default 'staff',
  created_at timestamptz not null default now(),

  constraint restaurant_users_unique_membership unique (restaurant_id, user_id)
);

create index restaurant_users_user_id_idx on public.restaurant_users (user_id);
create index restaurant_users_restaurant_id_idx on public.restaurant_users (restaurant_id);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,

  constraint business_hours_unique_weekday unique (restaurant_id, weekday),
  -- dia aberto exige os dois horários; dia fechado não exige nenhum
  constraint business_hours_times_present check (
    is_closed or (opens_at is not null and closes_at is not null)
  )
);

create index business_hours_restaurant_id_idx on public.business_hours (restaurant_id);

comment on table public.restaurants is 'Restaurantes cadastrados; raiz do isolamento multi-tenant.';
comment on column public.restaurants.slug is 'Identificador na URL pública, ex.: /pizzaria-do-ze';
comment on column public.restaurants.avg_prep_time_minutes is 'Base do cálculo de estimated_ready_at do pedido.';
comment on table public.restaurant_users is 'Membros com acesso ao painel de um restaurante.';
comment on table public.business_hours is 'Horário por dia da semana; 0 = domingo.';
