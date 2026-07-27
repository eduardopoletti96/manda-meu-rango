# Manda meu Rango — Próximos Passos

> Atualizado em 27/07/2026. Complementa o [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md): este documento registra **onde paramos**, **o que depende de você** e **a ordem de retomada**.

---

## 1. Estado atual

**Fases 0, 1, 2 e 3 concluídas** (exceto a Vercel, 0.4). **Fase 4 deployada e validada ponta a ponta** (backend + UI) com o provedor fake — **4.2 e 4.3 marcados no plano**; **4.1 segue aberto** até a entrega real via Meta Cloud API (o aceite pede "mensagem entregue"). Marco atingido: **o cliente navega pelo cardápio, monta o carrinho e se identifica por WhatsApp**.

### Fases 0 a 2 — completas

Resumo (detalhes nas versões anteriores deste documento e no histórico do git):

- **Fase 0** — Vite + React 19 + TS, Tailwind 4 + tokens, Supabase linkado, estrutura de rotas. ⚠️ **0.4 pendente: conexão com a Vercel** (repo no GitHub já conectado).
- **Fase 1** — schema completo, RLS multi-tenant testada, buckets e seed.
- **Fase 2** — painel do restaurante: auth completa, onboarding, dashboard, perfil, categorias e itens.

### Fase 3 — completa (nesta sessão, 23/07/2026)

Todas as tarefas verificadas no navegador (Chrome automatizado) contra o banco real, nos dois restaurantes de teste (Cantina da Nona e Pizzaria do Zé):

- ✅ **3.1** — Vitrine resolve o restaurante pelo slug (`StoreProvider` em `src/features/store/`): skeleton, 404 amigável para slug inexistente/inativo e aviso de "fechado agora" calculado de `business_hours` (aceita virada de madrugada; recalculado a cada minuto). **Página temporária `/status` removida.**
- ✅ **3.2** — Home da loja: capa (ou gradiente), logo, chips (aberto/fechado, horário de hoje, retirada/entrega, taxa, pedido mínimo), endereço e grid de categorias em 2 colunas com lazy loading e skeletons.
- ✅ **3.3** — Página da categoria: cards de item com imagem, descrição e preço, stepper de quantidade e "Adicionar" com feedback visual (botão verde "✓ Adicionado" por 1,5 s). Item indisponível fica visível e bloqueado ("Indisponível no momento").
- ✅ **3.4** — Carrinho em Zustand persistido em localStorage (`src/stores/cart-store.ts`), um carrinho por restaurante (trocar de loja não mistura). Badge animado com contagem no header. Verificado: sobrevive ao refresh; badge zera ao trocar de restaurante.
- ✅ **3.5** — Tela do carrinho: ajuste de quantidade, remoção, observação (persistida junto), total recalculado ao vivo, limpar carrinho, finalizar (leva ao checkout, ainda placeholder da Fase 5) e estado vazio com link ao cardápio. Avisos informativos de taxa de entrega e pedido mínimo.

**Bônus (débito técnico da Fase 2 quitado):** code-splitting por rota — o painel carrega sob demanda (`route.lazy`), o chunk principal caiu de 670 kB para 320 kB e o aviso de build sumiu.

`npm run lint` e `npm run build` passam (único warning do lint segue sendo o pré-existente do `button.tsx`).

### Fase 4 — deployada e validada (nesta sessão, 27/07/2026)

Toda a identificação do cliente por WhatsApp foi escrita, **deployada no projeto remoto e validada ponta a ponta** com o provedor fake. Migration `20260727120000_customer_token_hardening.sql` aplicada; as 3 Edge Functions deployadas; segredos `CUSTOMER_JWT_SECRET` (= Legacy JWT Secret) e `WHATSAPP_DEV_ECHO=true` configurados. Evidências: `send-phone-token` HTTP 200 (fake + dev echo), `verify-phone-token` cria cliente e emite JWT, código incorreto/expirado rejeitado, JWT do cliente **aceito pelo PostgREST (200)**, insert de restaurante com token de cliente **negado (403)**, e o fluxo de UI completo (item → carrinho → identificação → checkout, sessão persiste no refresh). **4.2 e 4.3 marcados**; **4.1 aberto** até a entrega real via Meta.

- **4.1** — Edge Function `send-whatsapp` com camada de provedor: **Meta Cloud API com fallback "fake"** (sem `WHATSAPP_API_TOKEN`, loga o código no console em vez de enviar), registro em `notification_logs` e um retry. É interna (exige o service role no `Authorization`). Módulos em `supabase/functions/_shared/` (`cors`, `supabase-admin`, `whatsapp`, `notify`).
- **4.2** — `send-phone-token` (código de 6 dígitos, guarda só o hash SHA-256 com pepper, TTL 5 min, rate limit 1/min e 5/hora) e `verify-phone-token` (comparação em tempo constante, limite de 5 tentativas, `upsert` do cliente por telefone e emissão de **JWT HS256 com o claim `customer_id`** que a RLS lê). Migration `20260727120000_customer_token_hardening.sql` blinda a criação de restaurante contra tokens de cliente.
- **4.3** — Tela `/:slug/identificacao` em duas etapas (nome + telefone com máscara BR → código, com reenvio por contador de 60 s e estado "já identificado"). Sessão do cliente em store Zustand persistida (`src/stores/customer-session-store.ts`). O "Finalizar" do carrinho passa pela identificação quando preciso; o carrinho persiste. Em modo fake, a tela mostra o código para facilitar o teste.

**Decisão de identidade:** o cliente continua sem conta no Supabase Auth. O JWT é assinado com o **JWT secret do projeto** (env `CUSTOMER_JWT_SECRET`, = **Legacy JWT Secret** do dashboard) e usa `role: authenticated` — os grants de tabela padrão valem e a policy de onboarding foi endurecida para negar esse token. Validado nesta sessão: o PostgREST aceita o token HS256 (200).

> ⚠️ **Descoberta desta sessão (impacta a Fase 5):** o projeto **já tem o novo sistema de chaves assimétricas ativo** (segredos auto-injetados `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`). O Legacy JWT Secret HS256 ainda é aceito (a anon key HS256 prova), mas a Supabase o está **deprecando**. Se as chaves legadas forem desativadas, tokens HS256 do cliente param de validar no PostgREST. **Antes da Fase 5, decidir:** manter o HS256 legado **ou** fazer o `create-order` (Edge Function com service role) **validar o token do cliente ele mesmo** — mais robusto e desacoplado das chaves do projeto (RLS por `current_customer_id()` deixaria de depender do secret legado).

---

## 2. Ações que dependem de você

### A. Deploy e teste da Fase 4 (WhatsApp) — ✅ concluído (27/07/2026)

Feito nesta sessão no projeto remoto linkado (`byhsxpwxfgvsltflxvmz`):

- [x] **Login na CLI** — já estava logado.
- [x] **Migration** de blindagem aplicada (`npx supabase db push` → `20260727120000_customer_token_hardening.sql`).
- [x] **`CUSTOMER_JWT_SECRET`** definido (= **Legacy JWT Secret** do dashboard; você setou via PowerShell).
- [x] **`WHATSAPP_DEV_ECHO=true`** setado — código aparece na tela/logs; **desligar antes de produção**.
- [x] **3 functions deployadas** (`send-whatsapp send-phone-token verify-phone-token`). `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` são injetadas — **não** configurar.
- [x] **Validado** via curl (send/verify/PostgREST/insert negado) e no navegador (fluxo de UI completo + persistência no refresh). GIF: `fase4-identificacao-cliente.gif`.

**O que falta para fechar a 4.1:** credenciais reais da Meta (`WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_VERIFICATION`) — aí o provedor real substitui o fake sozinho e a "mensagem entregue" do aceite passa a valer. Ver item E.

Limpeza opcional: clientes de teste (*Cliente Teste / Cliente Fase5 / Maria Teste*) e linhas em `phone_verifications` criados na validação — inofensivos.

### B. Vercel (conclui a 0.4)

- [ ] Criar conta em [vercel.com](https://vercel.com) e importar o repo `manda-meu-rango` (framework: **Vite**)
- [ ] Variáveis no projeto Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_BASE_URL` (a URL de produção)
- [ ] Confirmar que o preview por PR está habilitado (padrão da Vercel)

### C. URLs de redirecionamento no Supabase (necessário para o e-mail de recuperação de senha)

No dashboard → **Authentication → URL Configuration**:

- [ ] **Site URL**: `http://localhost:5173` (trocar pela URL da Vercel quando existir)
- [ ] **Redirect URLs**: adicionar `http://localhost:5173/**` (e depois `https://<seu-dominio>/**`)

Sem isso, o e-mail de "esqueci minha senha" chega mas o link cai em URL não autorizada. Lembrete: o SMTP embutido do Supabase tem limite baixo — suficiente para testes; o Resend entra na Fase 7.

### D. Limpeza opcional de dados de teste

- [ ] **Usuários no Authentication**: `mmr-*`/`st-*` antigos, `mmr-auth-<timestamp>@gmail.com`, `mmr-ui-test@gmail.com` e `mmr-onboard-test@gmail.com` (senha de teste: `RangoTeste!123`). Inofensivos; remova no dashboard se quiser.
- [ ] **Restaurante de teste "Pizzaria do Zé"** (slug `pizzaria-do-ze`, dono `mmr-onboard-test`): a Fase 3 já usou; agora pode apagar quando quiser (Table Editor → `restaurants`; o cascade limpa o resto). A **Cantina da Nona** (seed) segue útil para testar a vitrine com mais categorias/itens.

### E. Mais adiante (avisarei quando chegar a hora)

- [ ] **Fase 4 (real)** — Cloud API do WhatsApp (Meta): `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e o template aprovado. Até lá, o provedor fake cobre o desenvolvimento.
- [ ] **Fase 5** — Stripe em modo teste: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] **Fase 7** — Resend: `RESEND_API_KEY`
- [ ] **Fase 9** — Sentry e domínio customizado

Segredos de Edge Functions vão em `npx supabase secrets set` — nunca no `.env` do front.

---

## 3. Configurações do Supabase a lembrar

Ajustes feitos no dashboard (Authentication → Sign In / Providers → Email):

- **"Confirm email" desligado** — login sem clicar em link durante o desenvolvimento. O `SignUpPage` já trata o caso de a confirmação voltar a ser exigida.
- **"Allow new users to sign up" ligado** — necessário para o cadastro do painel.

Antes de produção (Fase 9), reavaliar a confirmação de e-mail para donos de restaurante.

---

## 4. Decisões de arquitetura em vigor

- **Identidade do cliente na RLS.** O cliente não tem conta no Supabase Auth; as políticas leem o claim `customer_id` que o `verify-phone-token` (Fase 4) emite — JWT HS256 assinado com `CUSTOMER_JWT_SECRET` (o JWT secret do projeto), `role: authenticated`, sessão de 30 dias em store persistida. A policy de insert de `restaurants` foi endurecida para negar esse token (não é um dono em potencial). O token só é validado pelo PostgREST a partir da Fase 5 (chamadas autenticadas do cliente).
- **Owner atribuído por trigger** (`assign_restaurant_owner`). O onboarding só cria o restaurante.
- **Item indisponível fica visível e bloqueado na vitrine**; o que some para o cliente é categoria/restaurante inativo. A vitrine filtra `is_active` explicitamente porque, para um **membro logado** do restaurante, a RLS devolveria também o conteúdo inativo.
- **"Aberto agora" usa a hora local do navegador** (MVP Brasil; fuso por restaurante fica para depois). Restaurante **sem nenhum horário configurado é tratado como aberto** (estado `unknown` — sem banner), para não parecer permanentemente fechado.
- **Carrinho por restaurante em um único storage** (`mmr-cart` no localStorage, record por `restaurant_id`), com observação junto. Preços gravados no carrinho são só exibição — a Edge Function `create-order` (Fase 5) revalida tudo no banco.
- **Validação de transição de status de pedido no banco** (trigger); status terminal é imutável.
- **`restaurant_id` denormalizado em `menu_items`**, com trigger de coerência.
- **Painel opera no primeiro restaurante do usuário** (`RestaurantProvider`); múltiplos restaurantes por conta ficam para depois do MVP.
- **Uploads com nome único por envio** (`logo-<timestamp>.png`); arquivos antigos ficam órfãos no bucket (aceitável por ora).
- **Painel em chunks lazy** (`route.lazy` no router); a vitrine fica no chunk principal por ser o caminho crítico do cliente.

---

## 5. Débito técnico a limpar

- **Arquivos órfãos nos buckets** ao trocar logo/capa/imagens várias vezes — limpar quando houver rotina de manutenção (pós-MVP).
- ~~Página temporária `/status`~~ — removida na 3.1.
- ~~Chunk > 500 kB no build~~ — resolvido com code-splitting por rota.

---

## 6. Como rodar e testar localmente

`npm run dev` sobe em `http://localhost:5173`:

- **`/cantina-da-nona`** — vitrine com o restaurante do seed: home com categorias, página de itens (o "Talharim ao funghi" demonstra o estado indisponível), carrinho persistente com observação.
- **`/pizzaria-do-ze`** — segundo restaurante de teste (carrinho separado do da Cantina).
- **`/admin`** — painel completo (`mmr-onboard-test@gmail.com` / `RangoTeste!123`, restaurante "Pizzaria do Zé").
- **`/`, `/slug-inexistente`** — landing placeholder e 404 amigável da vitrine.

Detalhes no [README](../README.md#estado-atual-e-como-testar).

---

## 7. Ordem de retomada

1. **Fase 5** (checkout e pagamento): **destravada** — é o próximo passo concreto. O `create-order` já vai consumir o JWT do cliente emitido na Fase 4. Antes de codar, decidir a estratégia de identidade dada a depreciação do Legacy JWT Secret (ver a nota ⚠️ na §4 / "Decisão de identidade").
2. **Fase 4 (real)** — quando as credenciais da Meta chegarem, o provedor real entra sozinho e a 4.1 fecha (item E).
3. **0.4** finaliza assim que a Vercel estiver conectada (independente; pode ser feita a qualquer momento).

| Marco | Significado |
|---|---|
| ✅ Fim da Fase 2 | Restaurante monta o cardápio |
| ✅ Fim da Fase 3 | Cliente navega e monta o carrinho |
| Fim da Fase 6 | MVP funcional (pedido pago e operado) |
| Fim da Fase 9 | Pronto para produção |

---

## 8. Resumo de progresso

**23 de 50 tarefas** entregues e validadas (Fases 0 a 3, exceto a Vercel na 0.4; **+ 4.2 e 4.3** da Fase 4). A **4.1** está implementada, deployada e validada no provedor fake, mas segue **aberta** até a entrega real via Meta. Próximo passo concreto: **Fase 5 — checkout e pagamento** (o `create-order` consome o JWT do cliente; ver a nota ⚠️ da §4 sobre a identidade antes de codar).
