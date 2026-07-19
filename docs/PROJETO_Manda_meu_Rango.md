# Manda meu Rango — Documento Base do Projeto

**Versão:** 1.0
**Tipo:** Plataforma SaaS multi-tenant de cardápio digital e gestão de pedidos para restaurantes

---

## 1. Visão geral

O **Manda meu Rango** é uma aplicação web que permite a restaurantes publicarem seu cardápio digital e receberem pedidos online, e a clientes navegarem pelo cardápio, montarem um carrinho, pagarem e acompanharem o pedido.

Cada restaurante possui um endereço próprio dentro da aplicação (`https://dominio.com/<slug-do-restaurante>`), que carrega sua identidade visual, cardápio, endereços e informações de contato.

### 1.1 Personas

| Persona | Descrição | Acesso |
|---|---|---|
| **Cliente** | Consumidor final que faz o pedido | Público, autenticado por nome + telefone com token via WhatsApp |
| **Restaurante (admin)** | Dono ou gerente do estabelecimento | Login por e-mail e senha |
| **Operador de cozinha/balcão** | Acompanha o kanban de pedidos | Login por e-mail e senha (papel restrito) |
| **Super admin (plataforma)** | Gestão de contas de restaurantes | Login por e-mail e senha |

### 1.2 Escopo do MVP

**Dentro do escopo:**
- Cadastro e configuração de restaurante (dados, logo, capa, endereço, contato, horários)
- CRUD de categorias e itens do cardápio
- Página pública do restaurante por slug
- Carrinho e checkout com retirada ou entrega
- Autenticação do cliente via telefone + token no WhatsApp
- Cadastro de endereço com autopreenchimento por CEP
- Pagamento via Stripe
- Kanban de pedidos em tempo real com timer e semáforo de cores
- Notificações ao cliente por WhatsApp (confirmação, produção, saída para entrega, avaliação)
- E-mails transacionais via Resend
- Relatórios de vendas

**Fora do escopo do MVP (backlog futuro):**
- App mobile nativo
- Programa de fidelidade e cupons de desconto
- Integração com iFood/Rappi
- Roteirização de entregadores
- Multi-unidade (filiais) sob a mesma conta

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | React 18 + TypeScript + Vite |
| Roteamento | React Router |
| Estilos | Tailwind CSS + shadcn/ui |
| Estado servidor | TanStack Query |
| Estado local | Zustand (carrinho) |
| Formulários | React Hook Form + Zod |
| Backend / BD | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) |
| Pagamentos | Stripe (Checkout ou Payment Element + Webhooks) |
| E-mail | Resend |
| WhatsApp | API de WhatsApp (Cloud API da Meta ou provedor equivalente) |
| CEP | ViaCEP (ou BrasilAPI como fallback) |
| Deploy/Hospedagem | Vercel |
| Versionamento | Git + GitHub |

### 2.1 Decisões de arquitetura

- **Toda regra de negócio sensível roda no backend** (Edge Functions do Supabase): cálculo de totais, criação de pedidos, emissão de tokens, integração com Stripe e WhatsApp. O front nunca define preços ou totais.
- **Multi-tenancy por linha (row-level)**: todas as tabelas de domínio carregam `restaurant_id` e são protegidas por Row Level Security (RLS).
- **Realtime**: o kanban usa Supabase Realtime nas tabelas `orders` e `order_status_history`.
- **Idempotência**: webhooks do Stripe e envios de WhatsApp são idempotentes (chave de evento armazenada).

### 2.2 Variáveis de ambiente

```
# Front-end (públicas)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_APP_BASE_URL=

# Edge Functions (secretas — nunca no front)
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

---

## 3. Estrutura de rotas

### 3.1 Público / cliente

| Rota | Descrição |
|---|---|
| `/` | Landing da plataforma |
| `/:slug` | Home do restaurante — capa, logo, grid de categorias (2 colunas) |
| `/:slug/categoria/:categoriaId` | Itens da categoria |
| `/:slug/carrinho` | Carrinho, observação, total, limpar, finalizar |
| `/:slug/checkout` | Retirada ou entrega, endereço, pagamento |
| `/:slug/pedido/:orderId` | Acompanhamento do pedido |
| `/:slug/avaliar/:orderId` | Avaliação pós-entrega |

### 3.2 Restaurante

| Rota | Descrição |
|---|---|
| `/admin/login` | Login por e-mail e senha |
| `/admin` | Dashboard |
| `/admin/cardapio` | CRUD de categorias e itens |
| `/admin/perfil` | Dados, logo, capa, endereço, contato, horários, taxa de entrega |
| `/admin/pedidos` | Kanban em tempo real |
| `/admin/relatorios` | Relatórios de vendas |
| `/admin/equipe` | Usuários e papéis |

---

## 4. Identidade visual

Visual moderno e alegre, que remeta ao prazer de comer.

**Princípios:**
- Cantos generosamente arredondados (`rounded-2xl` / `rounded-3xl`)
- Cores quentes e apetitosas; sombras suaves; muito espaço em branco
- Tipografia com display arredondada nos títulos e sans neutra no corpo
- Fotografia de comida em destaque — o cardápio é visual, não textual
- Microinterações no add ao carrinho (contador animado, feedback tátil)

**Paleta sugerida (tokens):**

```
--color-primary:    #FF6B35  /* laranja tomate */
--color-secondary:  #F7B801  /* amarelo mostarda */
--color-accent:     #2EC4B6  /* verde-água */
--color-success:    #22C55E
--color-warning:    #F59E0B
--color-danger:     #EF4444
--color-ink:        #2B2118  /* marrom quase preto */
--color-surface:    #FFFDF8  /* creme */
```

**Mobile-first obrigatório** — a maioria dos pedidos virá de celular.

---

## 5. Modelo de dados

### 5.1 Diagrama lógico

```
restaurants ─┬─< restaurant_users >─ auth.users
             ├─< categories ─< menu_items
             ├─< orders ─┬─< order_items
             │           ├─< order_status_history
             │           └─── reviews
             ├─< delivery_areas
             └─< notification_logs

customers ─┬─< customer_addresses
           ├─< phone_verifications
           └─< orders
```

### 5.2 Tabelas

#### `restaurants`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | caminho na URL |
| name | text | |
| description | text | |
| logo_url | text | Supabase Storage |
| cover_url | text | |
| phone | text | |
| email | text | |
| zip_code, street, number, complement, district, city, state | text | endereço |
| latitude, longitude | numeric | opcional |
| delivery_enabled | boolean | |
| pickup_enabled | boolean | |
| delivery_fee | numeric(10,2) | |
| min_order_value | numeric(10,2) | |
| avg_prep_time_minutes | int | base da previsão de entrega |
| stripe_account_id | text | Stripe Connect (opcional) |
| is_active | boolean | |
| created_at, updated_at | timestamptz | |

#### `restaurant_users`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| restaurant_id | uuid FK | |
| user_id | uuid FK → auth.users | |
| role | enum | `owner`, `manager`, `staff` |
| created_at | timestamptz | |

#### `business_hours`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| restaurant_id | uuid FK |
| weekday | int (0–6) |
| opens_at, closes_at | time |
| is_closed | boolean |

#### `categories`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| restaurant_id | uuid FK | |
| name | text | título do quadro |
| image_url | text | imagem do quadro |
| sort_order | int | ordenação no grid |
| is_active | boolean | |
| created_at, updated_at | timestamptz | |

#### `menu_items`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| restaurant_id | uuid FK | denormalizado para RLS |
| category_id | uuid FK | |
| name | text | |
| description | text | |
| image_url | text | |
| price | numeric(10,2) | |
| is_available | boolean | esgotado/disponível |
| sort_order | int | |
| created_at, updated_at | timestamptz | |

#### `customers`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| name | text | |
| phone | text UNIQUE | E.164, ex. +5551999999999 |
| phone_verified_at | timestamptz | |
| created_at | timestamptz | |

#### `phone_verifications`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| phone | text | |
| token_hash | text | hash do código de 6 dígitos |
| expires_at | timestamptz | 5 minutos |
| attempts | int | máx. 5 |
| consumed_at | timestamptz | |
| created_at | timestamptz | |

#### `customer_addresses`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| customer_id | uuid FK |
| label | text ("Casa", "Trabalho") |
| zip_code, street, district, city, state | text (autopreenchidos via CEP) |
| number, complement, reference | text (manuais) |
| is_default | boolean |
| created_at | timestamptz |

#### `orders`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| restaurant_id | uuid FK | |
| customer_id | uuid FK | |
| order_number | int | sequencial por restaurante |
| status | enum | ver 5.3 |
| fulfillment_type | enum | `pickup`, `delivery` |
| address_id | uuid FK nullable | obrigatório se delivery |
| address_snapshot | jsonb | endereço congelado no momento do pedido |
| notes | text | observação do carrinho |
| subtotal | numeric(10,2) | |
| delivery_fee | numeric(10,2) | |
| total | numeric(10,2) | |
| payment_status | enum | `pending`, `paid`, `failed`, `refunded` |
| stripe_payment_intent_id | text | |
| stripe_session_id | text | |
| estimated_ready_at | timestamptz | previsão |
| created_at | timestamptz | início do timer |
| paid_at, finished_at | timestamptz | |

#### `order_items`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| menu_item_id | uuid FK | |
| item_name | text | snapshot |
| unit_price | numeric(10,2) | snapshot |
| quantity | int | |
| line_total | numeric(10,2) | |

#### `order_status_history`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| order_id | uuid FK |
| from_status, to_status | enum |
| changed_by | uuid nullable |
| changed_at | timestamptz |

#### `reviews`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| order_id | uuid FK UNIQUE |
| restaurant_id | uuid FK |
| rating | int (1–5) |
| comment | text |
| created_at | timestamptz |

#### `notification_logs`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| order_id | uuid FK nullable |
| channel | enum (`whatsapp`, `email`) |
| template | text |
| destination | text |
| payload | jsonb |
| status | enum (`sent`, `failed`) |
| provider_message_id | text |
| error | text |
| created_at | timestamptz |

### 5.3 Enum de status do pedido

```
placed        → "Pedido realizado"
in_production → "Em produção"
ready         → "Pronto para retirada"
out_for_delivery → "Saiu para entrega"
finished      → "Finalizado"
cancelled     → "Cancelado"
```

Transições permitidas:
- `placed → in_production → ready → finished` (retirada)
- `placed → in_production → out_for_delivery → finished` (entrega)
- Qualquer status ativo → `cancelled`

### 5.4 Políticas RLS (resumo)

| Tabela | Leitura pública | Escrita |
|---|---|---|
| `restaurants` | Sim, se `is_active` | Apenas membros do restaurante |
| `categories`, `menu_items` | Sim, se `is_active` | Apenas membros do restaurante |
| `orders`, `order_items` | Cliente dono do pedido ou membro do restaurante | Criação via Edge Function (service role); atualização de status apenas por membros |
| `customers`, `customer_addresses` | Apenas o próprio cliente | Apenas o próprio cliente |
| `phone_verifications` | Nenhum acesso via cliente | Somente service role |

---

## 6. Fluxos principais

### 6.1 Autenticação do cliente

1. Cliente informa **nome** e **telefone** no checkout.
2. Edge Function `send-phone-token` gera código de 6 dígitos, grava o hash em `phone_verifications` (expira em 5 min) e envia via WhatsApp.
3. Cliente digita o código; Edge Function `verify-phone-token` valida, cria/atualiza `customers`, marca `phone_verified_at` e emite uma sessão Supabase.
4. Rate limit: máx. 3 envios por telefone a cada 15 minutos; máx. 5 tentativas por token.

### 6.2 Pedido do cliente (caminho feliz)

```
/:slug  →  escolhe categoria  →  seleciona itens e quantidades
        →  carrinho (revisar, observação, total)
        →  checkout: retirada ou entrega
        →  se entrega: escolhe ou cadastra endereço (modal por CEP)
        →  verificação de telefone (se ainda não autenticado)
        →  pagamento Stripe
        →  webhook confirma  →  pedido criado com status "placed"
        →  WhatsApp de confirmação  →  aparece no kanban do restaurante
```

**Regra crítica:** o pedido só entra em produção após confirmação de pagamento pelo webhook do Stripe. O front nunca marca o pedido como pago.

### 6.3 Cadastro de endereço por CEP

1. Cliente digita o CEP no modal.
2. Chamada ao ViaCEP → preenche automaticamente logradouro, bairro, cidade e UF (campos ficam somente leitura, com opção "editar manualmente").
3. Cliente preenche **número** e **complemento** (e referência, opcional).
4. Validação da área de entrega: se o CEP estiver fora da cobertura, avisa e bloqueia entrega, oferecendo retirada.

### 6.4 Kanban de pedidos

**Colunas:** Pedido realizado · Em produção · Pronto para retirada · Saiu para entrega · Finalizado

**Card contém:**
- Número do pedido e nome do cliente
- Hora do pedido
- Previsão de entrega estimada
- Endereço de entrega (ou etiqueta "Retirada")
- Resumo dos itens e valor total
- **Timer** contando desde `created_at`, parando em `finished`

**Semáforo do timer:**

| Cor | Condição |
|---|---|
| 🟢 Verde | Faltam mais de 10 min para `estimated_ready_at` |
| 🟠 Laranja | Faltam 10 min ou menos |
| 🔴 Vermelho | Passou de `estimated_ready_at` e o pedido não está em `ready` nem em `finished` |

O movimento entre colunas é por drag-and-drop, com atualização otimista e sincronização via Realtime para todos os operadores conectados.

### 6.5 Notificações

| Evento | Canal | Destinatário |
|---|---|---|
| Token de verificação | WhatsApp | Cliente |
| Pedido confirmado (pagamento aprovado) | WhatsApp + E-mail (Resend) | Cliente |
| Novo pedido recebido | E-mail (Resend) | Restaurante |
| Pedido em produção | WhatsApp | Cliente |
| Pronto para retirada | WhatsApp | Cliente |
| Saiu para entrega | WhatsApp | Cliente |
| Pedido finalizado + pedido de avaliação | WhatsApp | Cliente |
| Boas-vindas / recuperação de senha | E-mail (Resend) | Restaurante |

Todo envio é registrado em `notification_logs` com política de retry (3 tentativas com backoff exponencial).

---

## 7. Relatórios de vendas

- Faturamento por período (dia, semana, mês) com comparativo
- Quantidade de pedidos e ticket médio
- Itens mais vendidos (ranking)
- Distribuição retirada × entrega
- Tempo médio de preparo e de entrega
- Taxa de pedidos atrasados (vermelhos)
- Avaliação média e comentários recentes
- Exportação em CSV

---

## 8. Requisitos não funcionais

| Requisito | Meta |
|---|---|
| Performance | LCP < 2,5 s no 4G; imagens otimizadas via Supabase Storage transform |
| Responsividade | Mobile-first; testado de 360 px a 1920 px |
| Acessibilidade | Contraste AA, navegação por teclado, labels em todos os inputs |
| Segurança | RLS em todas as tabelas; segredos apenas em Edge Functions; validação Zod no cliente e no servidor |
| LGPD | Consentimento no cadastro; dados mínimos; exclusão de conta sob solicitação |
| Observabilidade | Logs estruturados nas Edge Functions; Sentry no front |
| Disponibilidade | Deploy com preview por PR na Vercel; rollback por commit |

---

## 9. Estrutura de pastas

```
manda-meu-rango/
├── src/
│   ├── app/                 # providers, router, layout raiz
│   ├── pages/
│   │   ├── public/          # landing
│   │   ├── store/           # páginas do restaurante (cliente)
│   │   └── admin/           # painel do restaurante
│   ├── components/
│   │   ├── ui/              # shadcn/ui
│   │   └── shared/          # componentes de domínio
│   ├── features/
│   │   ├── auth/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   └── reports/
│   ├── lib/                 # supabase client, stripe, viacep, utils
│   ├── hooks/
│   ├── stores/              # zustand
│   ├── types/               # tipos gerados do Supabase
│   └── styles/
├── supabase/
│   ├── migrations/
│   ├── functions/           # edge functions
│   └── seed.sql
├── public/
└── docs/
    ├── PROJETO_Manda_meu_Rango.md
    └── PLANO_DE_TAREFAS.md
```

---

## 10. Convenções de versionamento

**Branches:** `main` (produção) · `develop` (integração) · `feat/<nome>` · `fix/<nome>`

**Commits — Conventional Commits em português:**

```
feat(cardapio): adiciona CRUD de categorias
fix(carrinho): corrige cálculo do total com taxa de entrega
chore(deploy): configura variáveis de ambiente na Vercel
docs(readme): documenta setup local
refactor(kanban): extrai hook useOrderTimer
```

**Regra do projeto:** ao final de **cada tarefa** do plano de tarefas, obrigatoriamente um commit descrevendo o que foi implementado. Nenhuma tarefa é considerada entregue sem commit.

---

## 11. Próximo passo

O detalhamento em tarefas pequenas e entregáveis, com critérios de aceite e commit sugerido, está no documento **`PLANO_DE_TAREFAS.md`**.
