-- 5.4 — Estado do pedido anterior à confirmação de pagamento.
--
-- O documento base (§6.2) é explícito: o pedido só entra em produção depois que
-- o webhook do Stripe confirma o pagamento. Como o create-order grava o pedido
-- *antes* de cobrar (é ele que fixa preços e total), o pedido precisa de um
-- estado anterior a 'placed' — sem ele, um checkout abandonado apareceria no
-- kanban do restaurante como pedido a produzir.
--
-- Recriamos o type em vez de usar ALTER TYPE ... ADD VALUE porque o valor novo
-- não pode ser *usado* na mesma transação em que é adicionado (e usá-lo como
-- default da coluna é exatamente o ponto). Cada migration roda em uma
-- transação, então a recriação é o caminho seguro.

-- O Postgres recusa mudar o tipo de uma coluna citada em trigger ou policy.
-- Os dois triggers de status são declarados `of status`, e a policy de
-- avaliação exige pedido concluído. Saem aqui e voltam no fim, idênticos.
drop trigger if exists orders_validate_status_transition on public.orders;
drop trigger if exists orders_record_status_change on public.orders;
drop policy if exists reviews_insert_order_owner on public.reviews;

alter type public.order_status rename to order_status_old;

create type public.order_status as enum (
  'pending_payment',
  'placed',
  'in_production',
  'ready',
  'out_for_delivery',
  'finished',
  'cancelled'
);

alter table public.orders
  alter column status drop default;

alter table public.orders
  alter column status type public.order_status
  using status::text::public.order_status;

alter table public.order_status_history
  alter column from_status type public.order_status
    using from_status::text::public.order_status,
  alter column to_status type public.order_status
    using to_status::text::public.order_status;

alter table public.orders
  alter column status set default 'pending_payment';

drop type public.order_status_old;

-- Transições válidas (seção 5.3 do documento base) mais a nova aresta de
-- entrada: pending_payment -> placed, feita pelo webhook do Stripe (5.6).
-- Cancelamento a partir de pending_payment já é coberto pela regra geral de
-- "qualquer status ativo pode ser cancelado" — é o caminho do pagamento que
-- falha ou do checkout abandonado.
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
    (old.status = 'pending_payment' and new.status = 'placed')
    or (old.status = 'placed' and new.status = 'in_production')
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

create trigger orders_record_status_change
  after insert or update of status on public.orders
  for each row execute function public.record_order_status_change();

create policy reviews_insert_order_owner on public.reviews
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.customer_id = public.current_customer_id()
        and o.status = 'finished'
    )
  );

comment on column public.orders.status is
  'Estado operacional; comeca em pending_payment e vira placed quando o pagamento e confirmado.';
