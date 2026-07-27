-- 4.2 — Blindagem da criação de restaurante contra tokens de cliente.
--
-- A partir da Fase 4, o verify-phone-token emite um JWT com role='authenticated'
-- carregando o claim customer_id. A policy de insert de restaurants era aberta
-- a qualquer authenticated (bootstrap do onboarding, tarefa 2.2), então um
-- token de cliente também casaria nela.
--
-- Na prática o trigger assign_restaurant_owner já barraria: ele insere em
-- restaurant_users com user_id = auth.uid() (o sub do cliente), que não existe
-- em auth.users e viola a FK — a criação falha. Mesmo assim, trocamos esse erro
-- de FK por uma negação limpa de RLS: um token de cliente não é um dono em
-- potencial e não deve sequer passar pela policy de insert.

drop policy if exists restaurants_insert_authenticated on public.restaurants;

create policy restaurants_insert_authenticated on public.restaurants
  for insert to authenticated
  with check (public.current_customer_id() is null);
