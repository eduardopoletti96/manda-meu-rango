-- Fase 6 — A trilha de status precisa ser gravável pelo painel.
--
-- `order_status_history` tem RLS com política só de leitura: escrever nela é
-- privilégio do banco, não de quem está logado. Só que a trigger que a
-- alimenta (record_order_status_change, migration 20260720133000) roda com o
-- papel de quem disparou o UPDATE — e até aqui isso nunca incomodou porque
-- todo status vinha do service role (create-order insere, stripe-webhook
-- promove a placed), que ignora RLS.
--
-- A 6.4 muda isso: quem arrasta o card entre as colunas é o dono ou o
-- funcionário do restaurante, autenticado, sujeito à RLS. Sem este ajuste o
-- update falha inteiro com "new row violates row-level security policy for
-- table order_status_history" e o pedido nunca muda de coluna.
--
-- A saída é SECURITY DEFINER: a trigger passa a gravar com o papel do dono da
-- função. Continua sendo o único caminho para o histórico — nenhuma política
-- de INSERT é criada, então ninguém consegue forjar uma linha de auditoria
-- escrevendo direto na tabela. search_path fixo porque função SECURITY
-- DEFINER com search_path herdado é um vetor clássico de escalonamento.

create or replace function public.record_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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

comment on function public.record_order_status_change() is
  'Trilha de auditoria de status. SECURITY DEFINER: e o unico caminho de escrita em order_status_history, que nao tem policy de INSERT.';
