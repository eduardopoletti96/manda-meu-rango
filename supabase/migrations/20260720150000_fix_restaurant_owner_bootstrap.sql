-- Correção de segurança: fecha um vazamento entre tenants na política de
-- insert de restaurant_users.
--
-- A política anterior permitia que um usuário se registrasse como owner de um
-- restaurante "sem membros", detectando o vazio com um NOT EXISTS sobre
-- restaurant_users. Mas essa subconsulta roda sob RLS: um forasteiro não
-- enxerga os membros existentes de outro restaurante, então QUALQUER
-- restaurante parecia vazio para ele — e ele conseguia se inserir como owner,
-- passando a ler e editar dados alheios.
--
-- Novo desenho: o primeiro owner é atribuído por trigger no momento em que o
-- restaurante é criado (SECURITY DEFINER, fora da RLS). A política de insert
-- deixa de ter a porta de bootstrap e passa a exigir que quem insere já seja
-- admin do restaurante — o que só acontece para adicionar membros à própria
-- equipe.

-- Atribui automaticamente o criador do restaurante como owner. Roda como
-- definer para inserir em restaurant_users sem depender da política de insert.
-- auth.uid() é nulo quando o restaurante nasce via service role (seed): nesse
-- caso não há dono a vincular e a trigger apenas segue adiante.
create or replace function public.assign_restaurant_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    insert into public.restaurant_users (restaurant_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict (restaurant_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger restaurants_assign_owner
  after insert on public.restaurants
  for each row execute function public.assign_restaurant_owner();

-- Remove a porta de bootstrap defeituosa; mantém apenas a adição de membros
-- por quem já é admin do restaurante.
drop policy if exists restaurant_users_insert on public.restaurant_users;

create policy restaurant_users_insert_admins on public.restaurant_users
  for insert to authenticated
  with check (public.is_restaurant_admin(restaurant_id));

comment on function public.assign_restaurant_owner is
  'Vincula o criador do restaurante como owner; substitui a antiga politica de bootstrap de restaurant_users.';
