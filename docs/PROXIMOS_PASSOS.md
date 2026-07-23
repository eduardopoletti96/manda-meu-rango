# Manda meu Rango — Próximos Passos

> Atualizado em 23/07/2026. Complementa o [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md): este documento registra **onde paramos**, **o que depende de você** e **a ordem de retomada**.

---

## 1. Estado atual

**Fases 0, 1 e 2 concluídas** (exceto a Vercel, 0.4). Marco atingido: **o restaurante consegue montar o cardápio pelo painel**.

### Fase 0

- ✅ **0.1** — Vite + React 19 + TypeScript, ESLint, Prettier, `.gitignore`, `.env.example`
- ✅ **0.2** — Tailwind 4 + tokens da identidade visual + shadcn/ui + fontes Baloo 2 / Nunito Sans
- ✅ **0.3** — Projeto Supabase criado e linkado; conexão validada; `npm run db:types`
- ⚠️ **0.4** — Repo no GitHub conectado ([eduardopoletti96/manda-meu-rango](https://github.com/eduardopoletti96/manda-meu-rango)); **falta a conexão com a Vercel**
- ✅ **0.5** — Estrutura de pastas e rotas placeholder

### Fase 1 — completa

Migrations aplicadas e verificadas no projeto hospedado (detalhes na versão anterior deste documento e no histórico do git): schema completo, RLS multi-tenant testada com usuários reais, buckets de storage e seed.

### Fase 2 — completa (nesta sessão, 23/07/2026)

Todas as tarefas foram verificadas no navegador (Chrome automatizado) e com consultas ao banco real:

- ✅ **2.1** — Login por e-mail/senha, rotas protegidas, logout e recuperação de senha (`/admin/login`, `/admin/recuperar-senha`, `/admin/redefinir-senha`). Sessão persiste no refresh; erros do Auth traduzidos para PT-BR.
- ✅ **2.2** — Cadastro (`/admin/cadastro`) + onboarding com slug validado ao vivo (debounce + fallback na constraint unique). O trigger do banco torna o criador `owner` automaticamente (verificado).
- ✅ **2.3** — Layout do painel (sidebar com ícones, drawer no mobile, header com seção atual e link "Ver loja") + dashboard com cards de pedidos/faturamento/ticket médio do dia.
- ✅ **2.4** — Perfil em seções independentes: dados básicos, endereço, entrega/retirada (com trava de "pelo menos uma modalidade"), horários por dia (aceita virar a madrugada) e uploads de logo/capa para os buckets (leitura pública verificada, HTTP 200 no CDN).
- ✅ **2.5** — CRUD de categorias com drag-and-drop (`@dnd-kit`, ordem persistida em `sort_order`), ativar/desativar, upload de imagem e exclusão com aviso de cascata ("esta categoria tem N itens…").
- ✅ **2.6** — CRUD de itens por categoria (`/admin/cardapio/:categoriaId`): preço validado (vírgula ou ponto), disponibilidade, imagem e ordenação. Confirmado por consulta anônima: categoria inativa some para o cliente; item indisponível continua legível e **aparecerá bloqueado** na vitrine (decisão da RLS da Fase 1, alinhada ao aceite da 3.3).

`npm run lint` e `npm run build` passam (o único warning do lint segue sendo o pré-existente do `button.tsx`).

---

## 2. Ações que dependem de você

### A. Vercel (conclui a 0.4 — **único bloqueio de setup restante**)

- [ ] Criar conta em [vercel.com](https://vercel.com) e importar o repo `manda-meu-rango` (framework: **Vite**)
- [ ] Variáveis no projeto Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_BASE_URL` (a URL de produção)
- [ ] Confirmar que o preview por PR está habilitado (padrão da Vercel)

### B. URLs de redirecionamento no Supabase (necessário para o e-mail de recuperação de senha)

O link "Esqueci minha senha" envia um e-mail cujo destino precisa estar na lista de URLs permitidas. No dashboard → **Authentication → URL Configuration**:

- [ ] **Site URL**: `http://localhost:5173` (trocar pela URL da Vercel quando existir)
- [ ] **Redirect URLs**: adicionar `http://localhost:5173/**` (e depois `https://<seu-dominio>/**`)

Sem isso, o e-mail chega mas o link cai em URL não autorizada. Lembrete: o SMTP embutido do Supabase tem limite baixo de e-mails/hora — suficiente para testes pontuais; o Resend entra na Fase 7.

### C. Limpeza opcional de dados de teste

- [ ] **Usuários no Authentication**: além dos `mmr-*`/`st-*` antigos, esta sessão criou `mmr-auth-<timestamp>@gmail.com`, `mmr-ui-test@gmail.com` e `mmr-onboard-test@gmail.com` (senha de teste: `RangoTeste!123`). Inofensivos; remova no dashboard se quiser.
- [ ] **Restaurante de teste "Pizzaria do Zé"** (slug `pizzaria-do-ze`, dono `mmr-onboard-test`): criado pelo teste do onboarding, com categorias/itens/logo de exemplo. **Sugestão: manter até o fim da Fase 3** — é útil para testar a vitrine — e apagar depois (Table Editor → `restaurants`; o cascade limpa o resto).

### D. Mais adiante (avisarei quando chegar a hora)

- [ ] **Fase 4** — Cloud API do WhatsApp (Meta): `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- [ ] **Fase 5** — Stripe em modo teste: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] **Fase 7** — Resend: `RESEND_API_KEY`
- [ ] **Fase 9** — Sentry e domínio customizado

Segredos de Edge Functions vão em `npx supabase secrets set` — nunca no `.env` do front.

---

## 3. Configurações do Supabase a lembrar

Ajustes feitos no dashboard (Authentication → Sign In / Providers → Email):

- **"Confirm email" desligado** — login sem clicar em link durante o desenvolvimento. O `SignUpPage` já trata o caso de a confirmação voltar a ser exigida (mostra aviso em vez de seguir para o onboarding).
- **"Allow new users to sign up" ligado** — necessário para o cadastro do painel.

Antes de produção (Fase 9), reavaliar a confirmação de e-mail para donos de restaurante.

---

## 4. Decisões de arquitetura em vigor

- **Identidade do cliente na RLS.** O cliente não tem conta no Supabase Auth; as políticas leem o claim `customer_id` que a Edge Function da Fase 4 emitirá. Até lá, acesso de cliente é negado por padrão.
- **Owner atribuído por trigger** (`assign_restaurant_owner`). O onboarding só cria o restaurante — confirmado na 2.2.
- **Item indisponível fica visível e bloqueado na vitrine** (política `menu_items_select_public`); o que some para o cliente é categoria/restaurante inativo.
- **Validação de transição de status de pedido no banco** (trigger); status terminal é imutável.
- **`restaurant_id` denormalizado em `menu_items`**, com trigger de coerência.
- **Painel opera no primeiro restaurante do usuário** (`RestaurantProvider`): o suporte visual a múltiplos restaurantes por conta fica para depois do MVP.
- **Uploads com nome único por envio** (`logo-<timestamp>.png`) para evitar cache velho do CDN; arquivos antigos ficam órfãos no bucket (aceitável por ora).

---

## 5. Débito técnico a limpar

- **Página temporária `/status`** (`src/pages/StatusPage.tsx` + rota) — **remover na Fase 3** (pontos marcados com `TEMPORÁRIO`).
- **Aviso de chunk > 500 kB no build** — endereçar com code-splitting por rota (candidato natural: separar painel e vitrine) quando a Fase 3 crescer o app.
- **Arquivos órfãos nos buckets** ao trocar logo/capa/imagens várias vezes — limpar quando houver rotina de manutenção (pós-MVP).

---

## 6. Como rodar e testar localmente

`npm run dev` sobe em `http://localhost:5173`:

- **`/admin`** — painel completo: crie conta em `/admin/cadastro` ou use o restaurante de teste (`mmr-onboard-test@gmail.com` / `RangoTeste!123`, restaurante "Pizzaria do Zé").
- **`/status`** — diagnóstico da conexão com o Supabase (lê a Cantina da Nona do seed).
- **`/`, `/qualquer-slug`** — ainda placeholders; vitrine real na Fase 3.

Detalhes no [README](../README.md#estado-atual-e-como-testar).

---

## 7. Ordem de retomada

1. **Fase 3** (vitrine do cliente): resolução por slug, header + grid de categorias, listagem de itens, carrinho — **remover a `/status` aqui**
2. **0.4** finaliza assim que a Vercel estiver conectada (independente; pode ser feita a qualquer momento)

| Marco | Significado |
|---|---|
| ✅ Fim da Fase 2 | Restaurante monta o cardápio |
| Fim da Fase 3 | Cliente navega e monta o carrinho |
| Fim da Fase 6 | MVP funcional (pedido pago e operado) |
| Fim da Fase 9 | Pronto para produção |

---

## 8. Resumo de progresso

**16 de 50 tarefas** entregues (Fases 0, 1 e 2 completas, exceto a Vercel na 0.4). Próximo passo natural: **Fase 3 — vitrine do cliente**.
