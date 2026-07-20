-- 1.5 — Row Level Security multi-tenant (seção 5.4 do documento base).
--
-- Dois sujeitos distintos acessam o banco:
--   * membros do restaurante — autenticados no Supabase Auth (auth.uid());
--   * clientes — identificados por telefone verificado, sem conta no Auth.
--     A Edge Function de verificação (Fase 4) emite um JWT com o claim
--     customer_id; até lá nenhum token do cliente carrega esse claim, então
--     as políticas de cliente simplesmente não casam e o acesso é negado.
--
-- O service_role ignora RLS por definição: é o que as Edge Functions usam
-- para criar pedidos e manipular tokens de verificação.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER para não reentrar na RLS de restaurant_users — sem isso, a
-- política dessa tabela consultaria a si mesma em recursão infinita.
create or replace function public.is_restaurant_member(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.restaurant_users
    where restaurant_id = target_restaurant_id
      and user_id = auth.uid()
  );
$$;

-- Operações sobre a equipe e sobre o próprio restaurante exigem papel elevado.
create or replace function public.is_restaurant_admin(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.restaurant_users
    where restaurant_id = target_restaurant_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

-- Cliente corrente a partir do claim do JWT; NULL para anon e para membros.
create or replace function public.current_customer_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'customer_id', '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- restaurants — leitura pública se ativo; escrita apenas por membros
-- ---------------------------------------------------------------------------

alter table public.restaurants enable row level security;

create policy restaurants_select_public on public.restaurants
  for select using (is_active or public.is_restaurant_member(id));

-- Onboarding (2.2): o usuário cria o restaurante e só então vira owner.
create policy restaurants_insert_authenticated on public.restaurants
  for insert to authenticated with check (true);

create policy restaurants_update_members on public.restaurants
  for update using (public.is_restaurant_member(id))
  with check (public.is_restaurant_member(id));

create policy restaurants_delete_admins on public.restaurants
  for delete using (public.is_restaurant_admin(id));

-- ---------------------------------------------------------------------------
-- restaurant_users — a própria equipe
-- ---------------------------------------------------------------------------

alter table public.restaurant_users enable row level security;

create policy restaurant_users_select_members on public.restaurant_users
  for select using (
    user_id = auth.uid() or public.is_restaurant_member(restaurant_id)
  );

-- Duas portas: admin adiciona alguém, ou o primeiro usuário se registra como
-- owner do restaurante recém-criado (que ainda não tem nenhum membro).
create policy restaurant_users_insert on public.restaurant_users
  for insert to authenticated with check (
    public.is_restaurant_admin(restaurant_id)
    or (
      user_id = auth.uid()
      and not exists (
        select 1 from public.restaurant_users existing
        where existing.restaurant_id = restaurant_users.restaurant_id
      )
    )
  );

create policy restaurant_users_update_admins on public.restaurant_users
  for update using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));

create policy restaurant_users_delete_admins on public.restaurant_users
  for delete using (public.is_restaurant_admin(restaurant_id));

-- ---------------------------------------------------------------------------
-- business_hours — leitura pública (a vitrine mostra "aberto agora")
-- ---------------------------------------------------------------------------

alter table public.business_hours enable row level security;

create policy business_hours_select_public on public.business_hours
  for select using (true);

create policy business_hours_write_members on public.business_hours
  for all using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

-- ---------------------------------------------------------------------------
-- categories e menu_items — leitura pública apenas do que está ativo
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;

create policy categories_select_public on public.categories
  for select using (
    (
      is_active
      and exists (
        select 1 from public.restaurants r
        where r.id = categories.restaurant_id and r.is_active
      )
    )
    or public.is_restaurant_member(restaurant_id)
  );

create policy categories_write_members on public.categories
  for all using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

alter table public.menu_items enable row level security;

-- Item indisponível continua visível (aparece bloqueado na vitrine); o que
-- some é o item de categoria inativa ou de restaurante inativo.
create policy menu_items_select_public on public.menu_items
  for select using (
    exists (
      select 1
      from public.categories c
      join public.restaurants r on r.id = c.restaurant_id
      where c.id = menu_items.category_id
        and c.is_active
        and r.is_active
    )
    or public.is_restaurant_member(restaurant_id)
  );

create policy menu_items_write_members on public.menu_items
  for all using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

-- ---------------------------------------------------------------------------
-- customers e customer_addresses — apenas o próprio cliente
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;

create policy customers_select_self on public.customers
  for select using (id = public.current_customer_id());

create policy customers_update_self on public.customers
  for update using (id = public.current_customer_id())
  with check (id = public.current_customer_id());

alter table public.customer_addresses enable row level security;

create policy customer_addresses_all_self on public.customer_addresses
  for all using (customer_id = public.current_customer_id())
  with check (customer_id = public.current_customer_id());

-- ---------------------------------------------------------------------------
-- phone_verifications — nenhum acesso via cliente; somente service role
-- ---------------------------------------------------------------------------

alter table public.phone_verifications enable row level security;

-- RLS habilitada sem nenhuma política: toda leitura e escrita é negada, e o
-- acesso fica restrito ao service_role das Edge Functions.

-- ---------------------------------------------------------------------------
-- orders e derivados
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;

create policy orders_select_owner_or_member on public.orders
  for select using (
    public.is_restaurant_member(restaurant_id)
    or customer_id = public.current_customer_id()
  );

-- Criação é sempre via Edge Function (service role): é lá que o total é
-- recalculado a partir do cardápio, sem confiar no que o carrinho enviou.
create policy orders_update_members on public.orders
  for update using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));

alter table public.order_items enable row level security;

create policy order_items_select_visible_order on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          public.is_restaurant_member(o.restaurant_id)
          or o.customer_id = public.current_customer_id()
        )
    )
  );

alter table public.order_status_history enable row level security;

create policy order_status_history_select_visible_order on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (
          public.is_restaurant_member(o.restaurant_id)
          or o.customer_id = public.current_customer_id()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- reviews — nota é pública; só o dono do pedido avalia
-- ---------------------------------------------------------------------------

alter table public.reviews enable row level security;

create policy reviews_select_public on public.reviews
  for select using (true);

create policy reviews_insert_order_owner on public.reviews
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.customer_id = public.current_customer_id()
        and o.status = 'finished'
    )
  );

-- ---------------------------------------------------------------------------
-- notification_logs — auditoria interna do restaurante
-- ---------------------------------------------------------------------------

alter table public.notification_logs enable row level security;

create policy notification_logs_select_members on public.notification_logs
  for select using (
    order_id is not null
    and exists (
      select 1 from public.orders o
      where o.id = notification_logs.order_id
        and public.is_restaurant_member(o.restaurant_id)
    )
  );

-- Escrita apenas pelas Edge Functions (service role).
