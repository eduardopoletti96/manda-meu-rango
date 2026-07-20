-- 1.4 — Pedidos, itens, histórico de status, avaliações e logs de notificação.

create type public.order_status as enum (
  'placed',
  'in_production',
  'ready',
  'out_for_delivery',
  'finished',
  'cancelled'
);

create type public.fulfillment_type as enum ('pickup', 'delivery');

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type public.notification_channel as enum ('whatsapp', 'email');

create type public.notification_status as enum ('sent', 'failed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,

  -- sequencial por restaurante, atribuído pela trigger abaixo
  order_number int not null,

  status public.order_status not null default 'placed',
  fulfillment_type public.fulfillment_type not null,

  -- o endereço salvo pode ser editado ou removido depois; o snapshot é a
  -- versão congelada que vale para este pedido.
  address_id uuid references public.customer_addresses (id) on delete set null,
  address_snapshot jsonb,

  notes text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),

  payment_status public.payment_status not null default 'pending',
  stripe_payment_intent_id text,
  stripe_session_id text,

  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  finished_at timestamptz,

  constraint orders_unique_number_per_restaurant unique (restaurant_id, order_number),
  -- entrega exige endereço congelado; retirada não tem taxa de entrega
  constraint orders_delivery_requires_address check (
    fulfillment_type <> 'delivery' or address_snapshot is not null
  ),
  constraint orders_pickup_has_no_fee check (
    fulfillment_type <> 'pickup' or delivery_fee = 0
  ),
  constraint orders_total_matches_parts check (total = subtotal + delivery_fee)
);

create index orders_restaurant_status_idx on public.orders (restaurant_id, status);
create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);
create index orders_customer_created_idx on public.orders (customer_id, created_at desc);

-- Numeração sequencial por restaurante. A trava na linha do restaurante
-- serializa pedidos concorrentes do mesmo tenant, evitando dois pedidos com
-- o mesmo número; pedidos de restaurantes diferentes não se bloqueiam.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
as $$
declare
  next_number int;
begin
  perform 1 from public.restaurants where id = new.restaurant_id for update;

  select coalesce(max(order_number), 0) + 1 into next_number
  from public.orders
  where restaurant_id = new.restaurant_id;

  new.order_number = next_number;
  return new;
end;
$$;

create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- o item do cardápio pode ser removido depois; nome e preço ficam no snapshot
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(10, 2) generated always as (unit_price * quantity) stored
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index order_status_history_order_idx
  on public.order_status_history (order_id, changed_at);

-- Transições válidas conforme seção 5.3 do documento base. Validar aqui
-- impede que um bug no painel deixe o pedido num estado impossível.
create or replace function public.validate_order_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  -- estado terminal não volta atrás
  if old.status in ('finished', 'cancelled') then
    raise exception 'Pedido em status terminal (%) nao pode mudar para %', old.status, new.status;
  end if;

  -- qualquer status ativo pode ser cancelado
  if new.status = 'cancelled' then
    return new;
  end if;

  if not (
    (old.status = 'placed' and new.status = 'in_production')
    or (old.status = 'in_production' and new.status in ('ready', 'out_for_delivery'))
    or (old.status = 'ready' and new.status = 'finished')
    or (old.status = 'out_for_delivery' and new.status = 'finished')
  ) then
    raise exception 'Transicao de status invalida: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger orders_validate_status_transition
  before update of status on public.orders
  for each row execute function public.validate_order_status_transition();

-- Histórico completo: a criação entra como transição a partir de NULL.
create or replace function public.record_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;

  return new;
end;
$$;

create trigger orders_record_status_change
  after insert or update of status on public.orders
  for each row execute function public.record_order_status_change();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_restaurant_created_idx on public.reviews (restaurant_id, created_at desc);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  channel public.notification_channel not null,
  template text not null,
  destination text not null,
  payload jsonb,
  status public.notification_status not null,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index notification_logs_order_idx on public.notification_logs (order_id);
create index notification_logs_created_idx on public.notification_logs (created_at desc);

comment on table public.orders is 'Pedidos; numeracao sequencial por restaurante.';
comment on column public.orders.address_snapshot is 'Endereco congelado no momento do pedido; sobrevive a edicao ou exclusao do endereco original.';
comment on column public.orders.created_at is 'Inicio do timer de preparo exibido no kanban.';
comment on table public.order_items is 'Itens do pedido com snapshot de nome e preco.';
comment on column public.order_items.line_total is 'Coluna gerada: unit_price * quantity.';
comment on table public.order_status_history is 'Trilha de auditoria de mudancas de status, gravada por trigger.';
comment on table public.notification_logs is 'Registro de envios de WhatsApp e e-mail, com retorno do provedor.';
