-- Fase 6 — Operação de pedidos: o que o banco precisa oferecer ao kanban.
--
-- Quatro coisas: o restaurante passa a enxergar o cliente dos seus pedidos,
-- finished_at deixa de ficar nulo, orders e order_status_history entram na
-- publicação do Realtime e notification_logs ganha a trava que garante uma
-- única mensagem por transição de status.

-- ---------------------------------------------------------------------------
-- customers — o card do kanban mostra o nome de quem pediu
-- ---------------------------------------------------------------------------
--
-- Até aqui só o próprio cliente lia sua linha (customers_select_self), e o
-- painel não tinha como exibir "Pedido #12 — Maria". A leitura é liberada
-- apenas para quem é membro de um restaurante onde esse cliente pediu: sem
-- pedido, o restaurante continua sem enxergar a pessoa.

create policy customers_select_restaurant_members on public.customers
  for select using (
    exists (
      select 1 from public.orders o
      where o.customer_id = customers.id
        and public.is_restaurant_member(o.restaurant_id)
    )
  );

-- ---------------------------------------------------------------------------
-- finished_at — carimbo do fim do pedido
-- ---------------------------------------------------------------------------
--
-- A coluna existe desde a 1.4 mas ninguém a preenchia. O timer do kanban para
-- em 'finished' e os relatórios da Fase 8 medem o tempo de ponta a ponta, e
-- ambos precisam do instante em que o pedido saiu da operação. Fica no banco,
-- e não no painel, porque a hora do relógio do operador não é confiável.

create or replace function public.set_order_finished_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finished' and old.status is distinct from 'finished' then
    new.finished_at = now();
  end if;
  return new;
end;
$$;

create trigger orders_set_finished_at
  before update of status on public.orders
  for each row execute function public.set_order_finished_at();

comment on column public.orders.finished_at is
  'Instante em que o pedido entrou em finished; preenchido por trigger.';

-- ---------------------------------------------------------------------------
-- Realtime — orders e order_status_history (documento base §2.1)
-- ---------------------------------------------------------------------------
--
-- O kanban (6.5) escuta orders para ver o pedido novo chegar e a coluna mudar
-- em outro navegador; o acompanhamento do cliente (6.7) escuta o histórico
-- para desenhar a linha do tempo. Guardado por checagem porque `add table` em
-- tabela já publicada é erro, e a migration precisa ser reaplicável.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_status_history'
  ) then
    alter publication supabase_realtime add table public.order_status_history;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- notification_logs — uma mensagem por transição
-- ---------------------------------------------------------------------------
--
-- O aceite da 6.6 é literal: "cada transição gera exatamente uma mensagem
-- registrada em log". Como cada status tem seu template e o pedido passa uma
-- única vez por cada status, (pedido, canal, template) identifica a transição.
--
-- O índice é parcial em status = 'sent' de propósito: um envio que falhou não
-- ocupa a vaga, então a retentativa continua possível. Também exige order_id
-- não nulo — o template de verificação de telefone (Fase 4) não tem pedido e
-- se repete a cada código enviado.

create unique index notification_logs_one_sent_per_order_template
  on public.notification_logs (order_id, channel, template)
  where order_id is not null and status = 'sent';

comment on index public.notification_logs_one_sent_per_order_template is
  'Trava de idempotencia da 6.6: no maximo um envio bem-sucedido por pedido, canal e template.';
