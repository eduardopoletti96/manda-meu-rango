# Manda meu Rango — Próximos Passos

> Atualizado em 20/07/2026. Complementa o [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md): este documento registra **onde paramos**, **o que depende de você** e **a ordem de retomada**.

---

## 1. Estado atual

**Fase 0 concluída**, exceto a Vercel (0.4). **Fase 1 completa e verificada** no projeto Supabase hospedado.

### Fase 0

- ✅ **0.1** — Vite + React 19 + TypeScript, ESLint, Prettier, `.gitignore`, `.env.example`
- ✅ **0.2** — Tailwind 4 + tokens da identidade visual + shadcn/ui + fontes Baloo 2 / Nunito Sans
- ✅ **0.3** — Projeto Supabase criado e linkado; conexão validada; `npm run db:types` gerando tipos do schema real
- ⚠️ **0.4** — Repo no GitHub conectado e `main` publicada ([eduardopoletti96/manda-meu-rango](https://github.com/eduardopoletti96/manda-meu-rango)); **falta a conexão com a Vercel**
- ✅ **0.5** — Estrutura de pastas e rotas placeholder

### Fase 1 — completa

Todas as migrations aplicadas no banco remoto e verificadas com testes contra o projeto real (usuários autenticados de verdade, não só a anon key):

- ✅ **1.1** — `restaurants`, `restaurant_users`, `business_hours` + enum de papel
- ✅ **1.2** — `categories`, `menu_items`, com trigger que impede o `restaurant_id` denormalizado de divergir da categoria
- ✅ **1.3** — `customers`, `customer_addresses`, `phone_verifications`
- ✅ **1.4** — `orders`, `order_items`, `order_status_history`, `reviews`, `notification_logs`; numeração sequencial validada com 10 pedidos concorrentes
- ✅ **1.5** — RLS multi-tenant; isolamento entre dois owners autenticados verificado (leitura, escrita e adição de membros bloqueadas entre tenants)
- ✅ **1.6** — Buckets criados; `seed.sql` executado (Cantina da Nona); upload restrito à própria pasta e leitura pública verificados

`npm run lint` e `npm run build` passam. O único warning do lint é pré-existente, do `button.tsx` do shadcn.

> **Correção de segurança nesta etapa:** o teste com dois usuários reais expôs um vazamento entre tenants na política de insert de `restaurant_users` — um forasteiro conseguia se registrar como owner de restaurante alheio, porque o `NOT EXISTS` que checava "restaurante sem membros" rodava sob RLS e enxergava a equipe do outro como vazia. Corrigido: o primeiro owner passou a ser atribuído por trigger `SECURITY DEFINER`, e a política de insert exige que quem adiciona membros já seja admin. Re-testado, isolamento total.

---

## 2. Ações que dependem de você

### A. Vercel (conclui a 0.4 — **é o único bloqueio de setup restante**)

- [ ] Criar conta em [vercel.com](https://vercel.com) e importar o repo `manda-meu-rango` (framework: **Vite**)
- [ ] Variáveis no projeto Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_BASE_URL` (a URL de produção)
- [ ] Confirmar que o preview por PR está habilitado (padrão da Vercel)

### B. Limpeza opcional no Auth

- [ ] Os testes de RLS criaram alguns usuários com e-mails `mmr-*@gmail.com` e `st-*@gmail.com` no Authentication. São inofensivos (contas de teste, sem dados reais), mas você pode removê-los no dashboard → Authentication → Users se quiser deixar limpo. Não tenho a service_role, então não os apago por conta própria.

### C. Mais adiante (avisarei quando chegar a hora)

- [ ] **Fase 4** — Cloud API do WhatsApp (Meta): `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- [ ] **Fase 5** — Stripe em modo teste: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] **Fase 7** — Resend: `RESEND_API_KEY`
- [ ] **Fase 9** — Sentry e domínio customizado

Segredos de Edge Functions vão em `npx supabase secrets set` — nunca no `.env` do front.

---

## 3. Configurações do Supabase a lembrar

Durante o desenvolvimento, foram ajustados no dashboard (Authentication → Sign In / Providers → Email):

- **"Confirm email"** desligado — permite login sem clicar em link de e-mail durante o desenvolvimento.
- **"Allow new users to sign up"** ligado — necessário para o cadastro do painel na Fase 2.

Antes de ir para produção (Fase 9), reavaliar se a confirmação de e-mail deve voltar a ser exigida para os donos de restaurante.

---

## 4. Decisões de arquitetura em vigor

- **Identidade do cliente na RLS.** O cliente não tem conta no Supabase Auth. As políticas leem o claim `customer_id` do JWT, que a Edge Function de verificação por WhatsApp passará a emitir na Fase 4. Hoje nenhum token do cliente carrega o claim, então o acesso é negado por padrão e tudo passa por Edge Function.
- **Owner atribuído por trigger.** Ao criar um restaurante, o criador vira `owner` automaticamente (trigger `assign_restaurant_owner`). O fluxo de onboarding (2.2) só precisa criar o restaurante; não precisa inserir o vínculo de owner na mão.
- **Validação de transição de status no banco.** As transições da seção 5.3 são validadas por trigger: status terminal é imutável e saltos são rejeitados.
- **`restaurant_id` denormalizado em `menu_items`.** Mantido conforme o documento base, com trigger garantindo a coerência com a categoria.

---

## 5. Ordem de retomada

1. **Fase 2** (painel do restaurante): login, onboarding com slug, layout, perfil, CRUD de categorias e itens
2. **Fase 3** (vitrine do cliente): resolução por slug, grid de categorias, listagem de itens, carrinho
3. **0.4** finaliza assim que a Vercel estiver conectada

| Marco | Significado |
|---|---|
| Fim da Fase 2 | Restaurante monta o cardápio |
| Fim da Fase 3 | Cliente navega e monta o carrinho |
| Fim da Fase 6 | MVP funcional (pedido pago e operado) |
| Fim da Fase 9 | Pronto para produção |

---

## 6. Resumo de progresso

**11 de 50 tarefas** entregues (toda a Fase 0 exceto a Vercel + toda a Fase 1). Próximo passo natural: Fase 2. Nenhum retrabalho pendente.
