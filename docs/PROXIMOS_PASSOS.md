# Manda meu Rango — Próximos Passos

> Atualizado em 19/07/2026. Complementa o [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md): este documento registra **onde paramos**, **o que depende de você** e **a ordem de retomada**.

---

## 1. Estado atual

**Fase 0 (Fundação) concluída** nas partes que não dependem de contas externas — 5 commits na branch `main`:

- ✅ **0.1** — Vite + React 19 + TypeScript, ESLint, Prettier, `.gitignore`, `.env.example`
- ✅ **0.2** — Tailwind 4 + tokens da identidade visual + shadcn/ui (button, card, input, label) + fontes Baloo 2 / Nunito Sans
- ⚠️ **0.3** — Client Supabase pronto (`src/lib/supabase.ts`, script `npm run db:types`); **falta criar o projeto no Supabase e validar a conexão**
- ⚠️ **0.4** — `vercel.json` com rewrites de SPA pronto; **falta repo no GitHub + conexão com a Vercel**
- ✅ **0.5** — Estrutura de pastas completa e todas as rotas do documento base como placeholders (layouts público, loja e admin)

`npm run dev`, `npm run lint` e `npm run build` passam.

---

## 2. Ações que dependem de você (checklist)

### A. Supabase (desbloqueia as Fases 1 em diante)

- [ ] Criar conta/projeto em [supabase.com](https://supabase.com) (plano gratuito serve; região `sa-east-1` — São Paulo — recomendada)
- [ ] Copiar `.env.example` para `.env` e preencher (dashboard → **Settings → API**):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] No terminal do Claude Code, autenticar o CLI e linkar o projeto:
  ```
  ! npx supabase login
  ! npx supabase link --project-ref <ref-do-projeto>
  ```
  O `<ref>` aparece na URL do dashboard: `https://supabase.com/dashboard/project/<ref>`.

> Sua máquina não tem Docker, então não usamos Supabase local — as migrations serão aplicadas direto no projeto hospedado via `supabase db push`.

### B. GitHub (desbloqueia a 0.4 e o fluxo de PRs)

- [ ] Criar o repositório `manda-meu-rango` no GitHub (pode ser privado)
- [ ] Se tiver o GitHub CLI: `! gh auth login` — daí eu mesmo crio o repo e faço o push. Senão, me passe a URL do repo criado que eu configuro o remote e subo a `main`.

### C. Vercel (conclui a 0.4)

- [ ] Criar conta em [vercel.com](https://vercel.com) e importar o repo do GitHub (framework: **Vite**)
- [ ] Adicionar as variáveis de ambiente do front no projeto Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_BASE_URL` (a URL de produção) — `VITE_STRIPE_PUBLISHABLE_KEY` pode esperar a Fase 5
- [ ] Confirmar que o preview por PR está habilitado (padrão da Vercel)

### D. Mais adiante (não bloqueia agora — avisarei quando chegar a hora)

- [ ] **Fase 4** — Conta na Cloud API do WhatsApp (Meta) ou provedor equivalente: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- [ ] **Fase 5** — Conta Stripe (modo teste): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] **Fase 7** — Conta Resend: `RESEND_API_KEY`
- [ ] **Fase 9** — Conta Sentry (observabilidade) e domínio customizado

Os segredos de Edge Functions são configurados via `npx supabase secrets set` — nunca no `.env` do front.

---

## 3. Ordem de retomada (o que farei quando você voltar)

Com **Supabase linkado** (item A), sigo direto pelo plano:

1. **Concluir 0.3** — validar conexão com query de teste e marcar a tarefa
2. **Fase 1 completa** (6 tarefas): migrations de restaurantes/usuários/horários, cardápio, clientes/endereços/verificação de telefone, pedidos/histórico/avaliações, políticas RLS multi-tenant e buckets de storage + seed
3. **Fase 2** (painel do restaurante): login, onboarding com slug, layout do painel, perfil, CRUD de categorias e itens
4. **Fase 3** (vitrine do cliente): resolução por slug, grid de categorias, listagem de itens, carrinho (Zustand) e tela do carrinho

Com **GitHub + Vercel** (itens B e C), concluo a **0.4** em paralelo (push, deploy, validação da URL de produção).

As Fases 4–9 (WhatsApp, Stripe, kanban realtime, e-mails, relatórios, refinamento) seguem a ordem do [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md); os marcos continuam valendo:

| Marco | Significado |
|---|---|
| Fim da Fase 2 | Restaurante monta o cardápio |
| Fim da Fase 3 | Cliente navega e monta o carrinho |
| Fim da Fase 6 | MVP funcional (pedido pago e operado) |
| Fim da Fase 9 | Pronto para produção |

---

## 4. Resumo de progresso

**5 de 50 tarefas** entregues (Fase 0, com 0.3 e 0.4 aguardando apenas as vinculações acima). Nenhum retrabalho pendente; é seguro retomar de onde paramos.
