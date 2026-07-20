-- Dados de teste: um restaurante fictício completo.
--
-- Como rodar: cole no SQL Editor do dashboard do Supabase, ou
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- O script ignora RLS por rodar com papel privilegiado. É idempotente: apaga
-- o restaurante de slug 'cantina-da-nona' antes de recriar, e o cascade leva
-- junto categorias, itens e horários.

begin;

delete from public.restaurants where slug = 'cantina-da-nona';

with novo_restaurante as (
  insert into public.restaurants (
    slug, name, description, phone, email,
    zip_code, street, number, district, city, state,
    delivery_enabled, pickup_enabled,
    delivery_fee, min_order_value, avg_prep_time_minutes, is_active
  )
  values (
    'cantina-da-nona',
    'Cantina da Nona',
    'Massas artesanais e pizzas de forno a lenha, receita de família desde 1978.',
    '+555133334444',
    'contato@cantinadanona.com.br',
    '90420060', 'Rua Fernandes Vieira', '215', 'Bom Fim', 'Porto Alegre', 'RS',
    true, true,
    8.50, 30.00, 40, true
  )
  returning id
),

-- Fecha segunda-feira; demais dias das 18h à meia-noite.
horarios as (
  insert into public.business_hours (restaurant_id, weekday, opens_at, closes_at, is_closed)
  select
    novo_restaurante.id,
    dia,
    case when dia = 1 then null else time '18:00' end,
    case when dia = 1 then null else time '23:59' end,
    dia = 1
  from novo_restaurante, generate_series(0, 6) as dia
  returning restaurant_id
),

categorias as (
  insert into public.categories (restaurant_id, name, sort_order, is_active)
  select novo_restaurante.id, nome, ordem, true
  from novo_restaurante,
    (values
      ('Entradas', 0),
      ('Massas', 1),
      ('Pizzas', 2),
      ('Sobremesas', 3),
      ('Bebidas', 4)
    ) as c(nome, ordem)
  returning id, restaurant_id, name
)

insert into public.menu_items (restaurant_id, category_id, name, description, price, is_available, sort_order)
select
  categorias.restaurant_id,
  categorias.id,
  item.nome,
  item.descricao,
  item.preco,
  item.disponivel,
  item.ordem
from categorias
join (values
  ('Entradas',   'Bruschetta da casa',   'Pão italiano, tomate, manjericão e azeite extravirgem.',        28.00, true,  0),
  ('Entradas',   'Bolinho de arroz',     'Seis unidades, com queijo derretido no recheio.',               24.00, true,  1),
  ('Massas',     'Nhoque ao sugo',       'Nhoque de batata com molho de tomate San Marzano.',             46.00, true,  0),
  ('Massas',     'Ravioli de ricota',    'Recheio de ricota e espinafre ao molho de manteiga e sálvia.',  54.00, true,  1),
  ('Massas',     'Talharim ao funghi',   'Talharim fresco com funghi secchi e creme de leite fresco.',    58.00, false, 2),
  ('Pizzas',     'Margherita',           'Molho de tomate, muçarela de búfala e manjericão fresco.',      52.00, true,  0),
  ('Pizzas',     'Calabresa artesanal',  'Calabresa defumada da casa, cebola roxa e azeitona.',           49.00, true,  1),
  ('Pizzas',     'Quatro queijos',       'Muçarela, gorgonzola, parmesão e provolone.',                   56.00, true,  2),
  ('Sobremesas', 'Tiramisù',             'Receita da nona, com café coado na hora.',                      26.00, true,  0),
  ('Sobremesas', 'Petit gateau',         'Bolo quente de chocolate com sorvete de creme.',                28.00, true,  1),
  ('Bebidas',    'Água mineral 500ml',   'Com ou sem gás.',                                                6.00, true,  0),
  ('Bebidas',    'Refrigerante lata',    'Diversos sabores.',                                              8.00, true,  1),
  ('Bebidas',    'Suco de laranja 500ml','Espremido na hora.',                                            14.00, true,  2)
) as item(categoria, nome, descricao, preco, disponivel, ordem)
  on item.categoria = categorias.name;

commit;

-- Para operar este restaurante no painel, vincule sua conta como owner
-- (rode logado no SQL Editor, que expõe auth.uid()):
--
--   insert into public.restaurant_users (restaurant_id, user_id, role)
--   select id, auth.uid(), 'owner'
--   from public.restaurants
--   where slug = 'cantina-da-nona';
