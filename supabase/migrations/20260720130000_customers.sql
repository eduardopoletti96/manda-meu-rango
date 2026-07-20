-- 1.3 — Clientes, endereços de entrega e verificação de telefone.
-- O cliente não usa Supabase Auth: a identidade é o telefone verificado
-- por token no WhatsApp (fluxo 6.1 do documento base).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  phone text not null unique,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),

  -- E.164: '+' seguido de 8 a 15 dígitos, sem separadores. Normalizar na
  -- borda evita cadastro duplicado do mesmo número em formatos diferentes.
  constraint customers_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$')
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text,

  -- autopreenchidos via consulta de CEP
  zip_code text,
  street text,
  district text,
  city text,
  state text,

  -- informados manualmente
  number text,
  complement text,
  reference text,

  is_default boolean not null default false,
  created_at timestamptz not null default now(),

  constraint customer_addresses_state_uf check (state is null or state ~ '^[A-Z]{2}$'),
  constraint customer_addresses_zip_code_format check (zip_code is null or zip_code ~ '^[0-9]{8}$')
);

create index customer_addresses_customer_id_idx on public.customer_addresses (customer_id);

-- No máximo um endereço padrão por cliente. Índice parcial em vez de check
-- porque a regra atravessa linhas.
create unique index customer_addresses_one_default_per_customer
  on public.customer_addresses (customer_id)
  where is_default;

create table public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  -- nunca guardamos o código em claro: só o hash do valor de 6 dígitos
  token_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint phone_verifications_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint phone_verifications_expires_after_creation check (expires_at > created_at)
);

-- Busca do token ativo mais recente de um telefone.
create index phone_verifications_phone_created_idx
  on public.phone_verifications (phone, created_at desc);

-- Suporte à limpeza periódica de tokens vencidos.
create index phone_verifications_expires_at_idx on public.phone_verifications (expires_at);

comment on table public.customers is 'Clientes identificados por telefone verificado; nao usam Supabase Auth.';
comment on column public.customers.phone is 'Formato E.164, ex.: +5551999999999';
comment on table public.customer_addresses is 'Enderecos de entrega salvos pelo cliente.';
comment on table public.phone_verifications is 'Tokens de verificacao de telefone; acesso apenas via service role.';
comment on column public.phone_verifications.token_hash is 'Hash do codigo de 6 digitos; o codigo em claro nunca e persistido.';
comment on column public.phone_verifications.attempts is 'Tentativas de validacao; a Edge Function bloqueia a partir de 5.';
