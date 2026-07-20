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

O progresso está detalhado em [docs/PROXIMOS_PASSOS.md](docs/PROXIMOS_PASSOS.md). Em resumo: **Fase 0 e Fase 1 concluídas** — projeto configurado e todo o banco de dados (schema, RLS multi-tenant, storage, seed) aplicado no Supabase. O front-end ainda são páginas placeholder; as telas reais começam na Fase 2 (painel) e Fase 3 (vitrine).

O que dá para testar hoje:

1. **Conexão e dados de seed no navegador** — com `npm run dev` rodando, abra **http://localhost:5173/status**. É uma página temporária de diagnóstico que lê o restaurante de seed (Cantina da Nona) direto do Supabase e lista suas categorias e itens. Se aparecer "Conectado ✓" e o cardápio, então `.env`, o client e a leitura pública da RLS estão funcionando de ponta a ponta. _(Essa rota é removida na Fase 3.)_
2. **Navegação entre rotas placeholder** — `/` (landing), `/admin` (painel) e `/qualquer-slug` (loja) renderizam marcadores "Em construção". Confirma o roteamento e os layouts.
3. **Dados direto no Supabase** — no dashboard do projeto, em _Table Editor_ ou _SQL Editor_, é possível inspecionar as tabelas e o seed. Para popular/repopular o restaurante fictício, rode [supabase/seed.sql](supabase/seed.sql) no SQL Editor (é idempotente).

> Ainda **não** dá para ver o cardápio da Cantina em `/cantina-da-nona`: essa tela é a Fase 3. Por enquanto o cardápio de seed só aparece em `/status` ou no dashboard.

### Banco de dados

Sem Docker local, as migrations são aplicadas direto no projeto hospedado:

```bash
npx supabase link --project-ref <ref>   # uma vez por máquina
npx supabase db push                     # aplica as migrations pendentes
npm run db:types                         # regenera os tipos após mudanças no schema
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
