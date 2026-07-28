# Manda meu Rango 🍔

Plataforma SaaS multi-tenant de cardápio digital e gestão de pedidos para restaurantes.

- **Documento base:** [docs/PROJETO_Manda_meu_Rango.md](docs/PROJETO_Manda_meu_Rango.md)
- **Plano de tarefas:** [docs/PLANO_DE_TAREFAS.md](docs/PLANO_DE_TAREFAS.md)

## Stack

React 19 + TypeScript + Vite · Tailwind CSS 4 + shadcn/ui · React Router · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · Stripe · Resend · WhatsApp Cloud API

## Setup local

```bash
npm install
cp .env.example .env   # preencher com as chaves do Supabase e Stripe
npm run dev            # http://localhost:5173
```

## Estado atual e como testar

O progresso está detalhado em [docs/PROXIMOS_PASSOS.md](docs/PROXIMOS_PASSOS.md). Em resumo: **Fases 0 a 3 concluídas**, **Fase 4** (identificação do cliente por WhatsApp) entregue com provedor fake e **Fase 5 até a criação do pedido** — projeto configurado, banco completo (schema, RLS multi-tenant, storage, seed), **painel do restaurante funcional**, **vitrine com carrinho** e **checkout com endereço e pedido calculado no servidor**. Falta o pagamento (Stripe, 5.5 e 5.6).

O que dá para testar hoje:

1. **Vitrine do cliente** — com `npm run dev` rodando, abra **http://localhost:5173/cantina-da-nona** (restaurante do seed): home com capa, informações e categorias, página de itens com quantidade e adicionar ao carrinho (item indisponível aparece bloqueado), carrinho persistente com observação e total.
2. **Checkout** — em "Finalizar pedido", confirme o telefone (em modo de desenvolvimento o código aparece na tela), escolha entrega ou retirada e veja a taxa entrar e sair do total. Cadastre um endereço pelo CEP (ex.: `90010-150`) e finalize: o pedido é criado pela Edge Function `create-order`, que relê os preços no banco — mexer no valor pelo navegador não muda o que será cobrado.
3. **Painel do restaurante** — abra **http://localhost:5173/admin**. Crie uma conta (`/admin/cadastro`), cadastre um restaurante no onboarding (com validação de slug ao vivo) e explore: dashboard com resumo do dia, perfil (dados, endereço, entrega/retirada, horários, logo e capa) e cardápio (categorias e itens com drag-and-drop, ativar/desativar e upload de imagens). O link "Ver loja" abre a vitrine do seu restaurante.
4. **Dados direto no Supabase** — no dashboard do projeto, em _Table Editor_ ou _SQL Editor_, é possível inspecionar as tabelas e o seed. Para popular/repopular o restaurante fictício, rode [supabase/seed.sql](supabase/seed.sql) no SQL Editor (é idempotente).

### Banco de dados

Sem Docker local, as migrations são aplicadas direto no projeto hospedado:

```bash
npx supabase link --project-ref <ref>   # uma vez por máquina
npx supabase db push                     # aplica as migrations pendentes
npm run db:types                         # regenera os tipos após mudanças no schema
```

## Scripts

| Script             | Descrição                                     |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Sobe o servidor de desenvolvimento            |
| `npm run build`    | Type-check + build de produção                |
| `npm run lint`     | ESLint                                        |
| `npm run format`   | Prettier (write)                              |
| `npm run db:types` | Regenera `src/types/database.ts` via Supabase |

## Estrutura

Ver seção 9 do [documento base](docs/PROJETO_Manda_meu_Rango.md). Resumo: `src/app` (router, providers, layouts), `src/pages` (public/store/admin), `src/features` (domínios), `src/lib` (clients e utils), `supabase/` (migrations e edge functions).
