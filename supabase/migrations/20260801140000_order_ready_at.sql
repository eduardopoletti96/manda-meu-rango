-- 6.3 — Carimbo de quando o pedido ficou pronto.
--
-- O timer do kanban conta desde created_at e "para em ready e em finished".
-- Parar em finished já era possível (finished_at, migration 20260801120000);
-- parar em ready não, porque não havia onde ler o instante — e sem ele, ou o
-- relógio continua correndo depois de o pedido ficar pronto, ou congela num
-- valor que muda a cada recarregamento da página.
--
-- Mesma escolha de finished_at: quem carimba é o banco, não o painel. O
-- relógio da máquina do operador não decide o histórico do pedido.
--
-- De quebra, ready_at é o que a Fase 8 vai usar para "tempo médio de preparo"
-- (ready_at - created_at), separado do tempo de entrega.

alter table public.orders add column ready_at timestamptz;

comment on column public.orders.ready_at is
  'Instante em que o pedido entrou em ready; preenchido por trigger.';

create or replace function public.set_order_finished_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ready' and old.status is distinct from 'ready' then
    new.ready_at = now();
  end if;

  if new.status = 'finished' and old.status is distinct from 'finished' then
    new.finished_at = now();
  end if;

  return new;
end;
$$;

comment on function public.set_order_finished_at() is
  'Carimba ready_at e finished_at na entrada de cada um desses status.';
