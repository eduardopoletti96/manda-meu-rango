-- 5.6 — Idempotência do webhook do Stripe.
--
-- O Stripe reentrega eventos quando não recebe 2xx rápido o bastante, e um
-- mesmo evento pode chegar mais de uma vez mesmo em condições normais. Guardar
-- o id do evento e deixar a chave primária recusar o segundo é a forma mais
-- barata de garantir que processar duas vezes não muda nada (§2.1 do documento
-- base pede webhooks idempotentes).

create table public.stripe_events (
  -- id do evento no Stripe (evt_...); é ele que faz a idempotência
  id text primary key,
  type text not null,
  order_id uuid references public.orders (id) on delete set null,
  received_at timestamptz not null default now()
);

create index stripe_events_order_idx on public.stripe_events (order_id);

alter table public.stripe_events enable row level security;

-- RLS habilitada sem nenhuma política: leitura e escrita só pelo service_role
-- da Edge Function. Nenhum cliente ou restaurante tem o que fazer aqui.

-- O webhook chega com o id da sessão do Stripe e precisa achar o pedido.
create index orders_stripe_session_idx
  on public.orders (stripe_session_id)
  where stripe_session_id is not null;

comment on table public.stripe_events is
  'Eventos do Stripe ja processados; a PK garante a idempotencia do webhook.';
