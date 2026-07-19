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
npm run dev
```

## Scripts

| Script                 | Descrição                                        |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Sobe o servidor de desenvolvimento               |
| `npm run build`        | Type-check + build de produção                   |
| `npm run lint`         | ESLint                                           |
| `npm run format`       | Prettier (write)                                 |
| `npm run db:types`     | Regenera `src/types/database.ts` via Supabase    |

## Estrutura

Ver seção 9 do [documento base](docs/PROJETO_Manda_meu_Rango.md). Resumo: `src/app` (router, providers, layouts), `src/pages` (public/store/admin), `src/features` (domínios), `src/lib` (clients e utils), `supabase/` (migrations e edge functions).
