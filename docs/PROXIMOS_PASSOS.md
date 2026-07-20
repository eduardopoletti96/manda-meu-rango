# Manda meu Rango — Próximos Passos

> Atualizado em 20/07/2026. Complementa o [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md): este documento registra **onde paramos**, **o que depende de você** e **a ordem de retomada**.

---

## 1. Estado atual

**Fase 0 concluída**, exceto a 0.4 (Vercel). **Fase 1 escrita e aplicada** no projeto Supabase hospedado.

### Fase 0

- ✅ **0.1** — Vite + React 19 + TypeScript, ESLint, Prettier, `.gitignore`, `.env.example`
- ✅ **0.2** — Tailwind 4 + tokens da identidade visual + shadcn/ui + fontes Baloo 2 / Nunito Sans
- ✅ **0.3** — Projeto Supabase criado e linkado; conexão validada; `npm run db:types` gerando tipos do schema real
- ⚠️ **0.4** — `vercel.json` pronto; **falta repo no GitHub + conexão com a Vercel**
- ✅ **0.5** — Estrutura de pastas e rotas placeholder

### Fase 1

Todas as migrations foram aplicadas no banco remoto e verificadas com testes contra o projeto real:

- ✅ **1.1** — `restaurants`, `restaurant_users`, `business_hours` + enum de papel
- ✅ **1.2** — `categories`, `menu_items`, com trigger que impede o `restaurant_id` denormalizado de divergir da categoria
- ✅ **1.3** — `customers`, `customer_addresses`, `phone_verifications`
- ✅ **1.4** — `orders`, `order_items`, `order_status_history`, `reviews`, `notification_logs`; numeração sequencial por restaurante validada com 10 pedidos concorrentes
- ⚠️ **1.5** — RLS aplicada; **metade do aceite verificada** (ver abaixo)
- ⚠️ **1.6** — Buckets criados e `seed.sql` escrito; **nada disso foi executado ainda**

`npm run lint` e `npm run build` passam. O único warning do lint é pré-existente, do `button.tsx` do shadcn.

---

## 2. Bloqueio atual

A 1.5 e a 1.6 travaram no mesmo ponto: **não consigo criar usuários de teste no Auth**.

O que já está provado na 1.5, com a anon key: escrita anônima é negada em todas as tabelas, leitura de clientes, endereços, tokens, pedidos, itens, equipe e logs retorna vazio, e a leitura pública da vitrine continua funcionando.

O que **falta** provar: que um restaurante autenticado não lê dados de outro, e que o cliente só vê os próprios pedidos. Isso exige dois usuários reais no Supabase Auth.

### Como destravar

No dashboard: **Authentication → Sign In / Providers → Email → desmarcar "Confirm email" → Save**.

Sem envio de e-mail, some o rate limit e o `signUp` devolve sessão na hora. Você vai precisar disso na Fase 2 de qualquer forma, para desenvolver o login.

Feito isso, eu:

1. Crio dois usuários, monto um restaurante para cada e provo o isolamento entre tenants — fecha a **1.5**
2. Rodo o `seed.sql` e testo upload nos buckets — fecha a **1.6**

> Alternativa: colar `supabase/seed.sql` no SQL Editor do dashboard já popula a Cantina da Nona, o que adianta a 1.6 sem depender do Auth.

---

## 3. Ações que dependem de você

### A. Auth (desbloqueia 1.5 e 1.6 — **é o bloqueio de agora**)

- [ ] Desativar "Confirm email" em Authentication → Sign In / Providers → Email

### B. GitHub (desbloqueia a 0.4 e o fluxo de PRs)

- [ ] Criar o repositório `manda-meu-rango` no GitHub (pode ser privado)
- [ ] O GitHub CLI não está instalado nesta máquina. Instale (`winget install GitHub.cli`) e rode `gh auth login` num terminal comum, ou me passe a URL do repo que eu configuro o remote e subo a `main`.

### C. Vercel (conclui a 0.4)

- [ ] Criar conta em [vercel.com](https://vercel.com) e importar o repo (framework: **Vite**)
- [ ] Variáveis no projeto Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_BASE_URL`
- [ ] Confirmar que o preview por PR está habilitado (padrão da Vercel)

### D. Mais adiante (avisarei quando chegar a hora)

- [ ] **Fase 4** — Cloud API do WhatsApp (Meta): `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- [ ] **Fase 5** — Stripe em modo teste: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] **Fase 7** — Resend: `RESEND_API_KEY`
- [ ] **Fase 9** — Sentry e domínio customizado

Segredos de Edge Functions vão em `npx supabase secrets set` — nunca no `.env` do front.

---

## 4. Decisões tomadas nesta etapa

- **Identidade do cliente na RLS.** O cliente não tem conta no Supabase Auth. As políticas leem o claim `customer_id` do JWT, que a Edge Function de verificação por WhatsApp passará a emitir na Fase 4. Hoje nenhum token do cliente carrega o claim, então o acesso é negado por padrão e tudo passa por Edge Function — sem precisar reescrever as políticas depois.
- **Validação de transição de status no banco.** Além do histórico exigido pela 1.4, as transições da seção 5.3 são validadas por trigger: status terminal é imutável e saltos são rejeitados. Impede que um bug no painel deixe o pedido num estado impossível.
- **`restaurant_id` denormalizado em `menu_items`.** Mantido conforme o documento base para simplificar a RLS, mas com trigger garantindo a coerência com a categoria — sem isso, um update descuidado vazaria itens entre restaurantes.

---

## 5. Ordem de retomada

1. Fechar **1.5** e **1.6** assim que o Auth destravar
2. **Fase 2** (painel do restaurante): login, onboarding com slug, layout, perfil, CRUD de categorias e itens
3. **Fase 3** (vitrine do cliente): resolução por slug, grid de categorias, listagem de itens, carrinho
4. **0.4** em paralelo, assim que GitHub e Vercel existirem

| Marco | Significado |
|---|---|
| Fim da Fase 2 | Restaurante monta o cardápio |
| Fim da Fase 3 | Cliente navega e monta o carrinho |
| Fim da Fase 6 | MVP funcional (pedido pago e operado) |
| Fim da Fase 9 | Pronto para produção |

---

## 6. Resumo de progresso

**9 de 50 tarefas** entregues; 2 (1.5 e 1.6) aguardando apenas a verificação final. Nenhum retrabalho pendente.
