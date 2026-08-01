# Manda meu Rango — Próximos Passos

> Atualizado em 01/08/2026. Complementa o [PLANO_DE_TAREFAS.md](PLANO_DE_TAREFAS.md): este documento registra **onde paramos**, **o que depende de você** e **a ordem de retomada**.

---

## 1. Estado atual

**MVP funcional.** Fases 0, 1, 2, 3, 5 e **6** concluídas (exceto a Vercel, 0.4). **Fase 4** deployada e validada com o provedor fake — **4.2 e 4.3 marcados**; **4.1 segue aberto** até a entrega real via Meta Cloud API.

O ciclo fecha ponta a ponta: **o cliente monta o carrinho, se identifica, paga de verdade, o restaurante vê o pedido chegar no kanban e o move até finalizar, e o cliente acompanha cada etapa ao vivo — recebendo um WhatsApp a cada mudança.** Daqui para a frente é refinamento (Fases 7 a 9), não mais caminho crítico.

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

**Decisão de identidade:** o cliente continua sem conta no Supabase Auth. O JWT é assinado com o **JWT secret do projeto** (env `CUSTOMER_JWT_SECRET`, = **Legacy JWT Secret** do dashboard) e usa `role: authenticated` — os grants de tabela padrão valem e a policy de onboarding foi endurecida para negar esse token. Validado: o PostgREST aceita o token HS256 (200).

### Fase 5 — completa (28 e 29/07/2026)

**Checkout e pedido (5.1 a 5.4, 28/07).** Migration `20260728120000_order_pending_payment.sql` aplicada, Edge Function `create-order` deployada, e o fluxo validado por API (script de curl/PowerShell) **e** no navegador contra o banco real.

- ✅ **5.1** — `/:slug/checkout`: escolha de modalidade respeitando `delivery_enabled`/`pickup_enabled` (com card informativo quando só há uma), endereço de retirada do restaurante, resumo dos itens com a observação do carrinho, e bloqueio por pedido mínimo com o quanto falta. **Aceite verificado:** alternar para retirada tira a taxa do total (R$ 106,50 → R$ 98,00).
- ✅ **5.2** — `AddressDialog` com busca por CEP (ViaCEP e **BrasilAPI como fallback**, timeout de 6 s): logradouro, bairro, cidade e UF vêm preenchidos e travados, com "Editar manualmente" para destravar; CEP não encontrado ou provedores fora abrem o formulário manual em vez de bloquear.
- ✅ **5.3** — `AddressPicker`: lista com o padrão pré-selecionado (cai no mais recente quando não há padrão), tornar padrão, editar e excluir com confirmação em dois toques. Trocar o padrão desmarca o antigo antes de marcar o novo — o índice parcial `customer_addresses_one_default_per_customer` não permite dois.
- ✅ **5.4** — Edge Function `create-order`: relê preço e disponibilidade no banco (item de categoria inativa ou indisponível derruba o pedido), recalcula subtotal/taxa/total, valida modalidade e pedido mínimo, confere que o endereço é do próprio cliente, congela o `address_snapshot`, calcula `estimated_ready_at` a partir de `avg_prep_time_minutes` e grava como `pending_payment`. **Aceite verificado:** mandar `price: 0.01` no corpo não muda nada — o total saiu R$ 80,00 (preço do banco), não R$ 0,03.

**Identidade na Fase 5 (decisão tomada):** caminho **híbrido**. A **escrita** (`create-order`) recebe o JWT do cliente no header `x-customer-token` e **verifica a assinatura ela mesma** (`verifyCustomerJwt` em `_shared/jwt.ts`, com checagem de `alg` para barrar `alg: none`); o `Authorization` segue com a anon key, que é o que o gateway das Edge Functions confere. As **leituras** do cliente (endereços) continuam no PostgREST + RLS com o HS256 legado. Assim, se a Supabase revogar as chaves legadas, só o caminho de leitura precisa migrar — a criação de pedido é imune. Validado: token com assinatura adulterada é recusado (401) e endereço de outro cliente não entra no pedido.

**Estado inicial do pedido:** o enum `order_status` ganhou **`pending_payment`** (agora o default de `orders.status`). O documento base (§6.2) exige que o pedido só entre em produção após o webhook confirmar o pagamento, e o `create-order` grava antes de cobrar — sem esse estado, um checkout abandonado apareceria no kanban como pedido a produzir. A transição `pending_payment → placed` foi liberada no trigger de validação; cancelar continua permitido de qualquer estado ativo.

**Pagamento (5.5 e 5.6, 29/07).** Chaves do Stripe configuradas pelo usuário, migration `20260729120000_stripe_events.sql` aplicada, funções `create-payment-session` e `stripe-webhook` deployadas, e **um pagamento de teste completo validado no navegador**.

- ✅ **5.5** — `create-payment-session` recebe um pedido `pending_payment` e devolve a URL do **Checkout hospedado** do Stripe, montando as linhas a partir dos itens já gravados (taxa de entrega vira uma linha própria). A volta cai em `?pedido=<id>&pagamento=<sucesso|cancelado>`, tratada pelo `PaymentResult`. **Aceite verificado:** pagamento com `4242 4242 4242 4242` concluiu (R$ 64,50) e voltou para a aplicação mostrando "Pagamento confirmado — pedido #5".
- ✅ **5.6** — `stripe-webhook` valida a assinatura (variante assíncrona, Web Crypto) e só então promove o pedido para `paid`/`placed`. **Aceite verificado nas duas metades:** o reenvio real do evento pelo painel do Stripe não mudou nada (`paid_at` idêntico, histórico ainda com uma única transição, um único pedido pago); e o cartão de recusa `4000 0000 0000 0002` marcou `payment_status = failed` **mantendo o pedido em `pending_payment`**, para o cliente tentar de novo sem refazer o carrinho.

**Idempotência em duas travas:** a PK de `stripe_events` (o evento é registrado *antes* de agir, e a reentrega bate no atalho de duplicata) e o filtro `status = 'pending_payment'` no update (um replay não encontraria linha para atualizar). Se o processamento falhar, o registro do evento é removido — senão a reentrega do Stripe cairia no atalho de duplicata e o pedido nunca sairia de `pending_payment` por causa de uma falha passageira.

**Segurança do webhook:** deployado com `--no-verify-jwt`, porque quem chama é o Stripe e ele não tem JWT do Supabase. A autenticação da função é a assinatura do webhook: sem assinatura → 400, assinatura forjada → 400 (ambas verificadas).

### Fase 6 — completa (01/08/2026)

Quatro migrations aplicadas (`20260801120000` a `20260801140000`), a Edge Function `notify-order-status` deployada, o `stripe-webhook` reimplantado, e tudo validado no navegador contra o banco real — inclusive **uma compra de teste completa** com o cartão `4242…`.

- ✅ **6.1** — Kanban com as cinco colunas do §6.4 e contador por coluna. A consulta traz os pedidos do dia **mais** os que continuam em aberto (pedido feito 23h50 e ainda em produção à 00h10 não some na virada); `pending_payment` fica sempre de fora. **Aceite:** quatro pedidos de teste caíram cada um na sua coluna, com os contadores batendo.
- ✅ **6.2** — Card com número, cliente, hora, previsão, destino (endereço congelado ou etiqueta de retirada), resumo dos itens e total; detalhe em modal com telefone clicável, endereço completo, observação em destaque e preço por item.
- ✅ **6.3** — `useOrderTimer` com o semáforo do §6.4. Um relógio só para o quadro inteiro (`useSyncExternalStore` + um `setInterval` compartilhado). **Aceite:** verde, laranja, vermelho e parado na mesma tela, com previsão manipulada.
- ✅ **6.4** — Arrasto entre colunas com atualização otimista; a trigger do banco é quem valida de verdade. Alça de arrastar separada do corpo do card (o corpo abre o detalhe), coluna de destino pelo ponteiro (`pointerWithin`), colunas de altura igual. As mesmas transições em botões no detalhe, para toque e teclado. **Aceite:** transição inválida bloqueada com aviso ("Pedido de retirada não sai para entrega"); as válidas persistiram e apareceram em `order_status_history`.
- ✅ **6.5** — Realtime nas mudanças de `orders` do restaurante. O payload não traz cliente nem itens, então o evento diz *qual* pedido mudou e o quadro relê aquele pedido inteiro. Alerta = transição para `placed` (não o INSERT), com anel de destaque por 30 s e som sintetizado no WebAudio, com botão para desligar. **Aceite:** duas abas refletiram a mesma mudança em segundos, e o pedido novo apareceu nas duas.
- ✅ **6.6** — Um template de WhatsApp por transição (matriz do §6.5). **Aceite:** três transições pelo painel = três linhas em `notification_logs`; duas chamadas simultâneas para o mesmo status foram recusadas como duplicata; chamada sem sessão de restaurante levou 403. O `order_confirmed` foi verificado na compra real: o webhook promoveu o pedido **e** registrou o envio.
- ✅ **6.7** — `/:slug/pedido/:orderId` com a linha do tempo alimentada por `order_status_history` (hora real de cada etapa) e caminho conforme a modalidade. **Aceite:** mover o card no kanban levou a tela do cliente a "Em preparo", "Saiu para entrega" e "Concluído" sem recarregar. Que é o Realtime quem entrega (e não o poll de reserva) foi confirmado zerando todos os intervalos da página.

**Dois problemas reais achados e corrigidos no caminho:**

1. **A trilha de status não era gravável pelo painel.** `record_order_status_change` rodava com o papel de quem disparou o UPDATE e `order_status_history` só tem policy de leitura. Enquanto todo status vinha do service role (`create-order`, `stripe-webhook`) isso nunca apareceu — na 6.4, quem move o card é o restaurante autenticado, e **todo** update falhava. A trigger virou `SECURITY DEFINER` com `search_path` fixo, e continua sendo o único caminho de escrita no histórico (nenhuma policy de INSERT foi criada).
2. **O kanban ficava com dado velho depois de uma queda do socket.** Com a aba aberta por mais de uma hora o Realtime caiu e o pedido que chegou nesse meio-tempo não apareceu; quando a conexão voltava, o indicador ficava verde sobre um quadro furado. Agora toda reconexão recarrega o quadro inteiro.

**Coluna nova:** `orders.ready_at`, carimbada por trigger igual a `finished_at`. Sem ela o timer não tinha onde ler o instante em que o pedido ficou pronto. É também o que a Fase 8 vai usar para separar tempo de preparo de tempo de entrega.

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

**O que falta para fechar a 4.1:** credenciais reais da Meta (`WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_VERIFICATION`) — aí o provedor real substitui o fake sozinho e a "mensagem entregue" do aceite passa a valer. Ver item F.

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

Nada aqui atrapalha o desenvolvimento — é tudo cosmético.

- [ ] **Usuários no Authentication**: `mmr-*`/`st-*` antigos, `mmr-auth-<timestamp>@gmail.com`, `mmr-ui-test@gmail.com` e `mmr-onboard-test@gmail.com` (senha de teste: `RangoTeste!123`). Inofensivos; remova no dashboard se quiser.
- [ ] **Restaurante de teste "Pizzaria do Zé"** (slug `pizzaria-do-ze`, dono `mmr-onboard-test`): a Fase 3 já usou; agora pode apagar quando quiser (Table Editor → `restaurants`; o cascade limpa o resto). A **Cantina da Nona** (seed) segue útil para testar a vitrine com mais categorias/itens.
- [ ] **Clientes de teste** (*Cliente Teste / Cliente Fase5 / Maria Teste / Cliente Stripe / Cliente Intruso* e, da Fase 6, *Ana Kanban / Bruno Delivery / Carla Realtime*), endereços e linhas em `phone_verifications` criados nas validações.
- [ ] **Pedidos de teste na Cantina da Nona**: #1, #2, #3 e #4 em `pending_payment`, #6 em `pending_payment` com `payment_status = failed`, e **#5 pago e em `placed`**.
- [ ] **Pedidos de teste na Pizzaria do Zé** (Fase 6): seis pedidos espalhados pelas colunas, incluindo o **#6 pago de verdade** em modo teste. Sugiro **manter todos** enquanto a Fase 8 (relatórios) não estiver pronta — é a única massa com `ready_at`/`finished_at` preenchidos e transições reais em `order_status_history`.
- [ ] **Itens acrescentados à Pizzaria do Zé** (Calabresa, Quatro queijos, Refrigerante 2L) e a Margherita marcada como disponível — o cardápio dela tinha um item só, indisponível, e nenhum pedido podia ser criado. Vale manter.

### E. Stripe — ✅ concluído (29/07/2026)

Tudo em **modo teste**, configurado por você e validado nesta sessão:

- [x] `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`) no `.env` do front
- [x] `STRIPE_SECRET_KEY` em `npx supabase secrets set`
- [x] `STRIPE_WEBHOOK_SECRET`, com o endpoint `https://byhsxpwxfgvsltflxvmz.supabase.co/functions/v1/stripe-webhook` cadastrado no painel, escutando `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `payment_intent.payment_failed`

Cartões de teste: `4242 4242 4242 4242` aprova, `4000 0000 0000 0002` recusa (qualquer validade futura e qualquer CVC).

**Pendências antes de produção:** trocar as chaves de teste pelas de produção e recadastrar o endpoint do webhook (o `whsec_` é outro); definir `APP_BASE_URL` nos segredos das Edge Functions, senão o retorno do Stripe aponta para `localhost`; e preencher o **nome público da conta** no Stripe (Settings → Business → Public details) — hoje a tela de pagamento mostra "Área restrita de Eduardo Poletti" para o cliente.

### F. Mais adiante (avisarei quando chegar a hora)

- [ ] **Fase 4 (real)** — Cloud API do WhatsApp (Meta): `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e o template aprovado. Até lá, o provedor fake cobre o desenvolvimento.
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

- **Identidade do cliente na RLS.** O cliente não tem conta no Supabase Auth; as políticas leem o claim `customer_id` que o `verify-phone-token` (Fase 4) emite — JWT HS256 assinado com `CUSTOMER_JWT_SECRET` (o JWT secret do projeto), `role: authenticated`, sessão de 30 dias em store persistida. A policy de insert de `restaurants` foi endurecida para negar esse token (não é um dono em potencial).
- **Escrita do cliente valida o token na própria Edge Function** (Fase 5, caminho híbrido): o `create-order` roda com service role, fora da RLS, e por isso confere a assinatura do JWT ele mesmo — o token vai no header `x-customer-token` e o `Authorization` continua levando a anon key. As leituras do cliente seguem no PostgREST + RLS. Se as chaves legadas forem revogadas, só as leituras precisam migrar.
- **Cliente Supabase separado para o cliente identificado** (`customerSupabase(token)` em `src/lib/supabase.ts`): instância própria, com `persistSession` desligado e o JWT no header. No mesmo navegador pode haver um dono logado no painel, e as duas identidades não podem se misturar.
- **Pedido nasce em `pending_payment`.** O `create-order` grava antes de cobrar; só o webhook do Stripe promove para `placed`. O kanban da Fase 6 nunca vê um checkout abandonado — e, por consequência, **o kanban lista por `status`, não precisa filtrar por `payment_status`**.
- **Criar o pedido e cobrar são passos separados** (`create-order` e `create-payment-session`). Desistir do pagamento e voltar gera uma nova sessão do Stripe para o mesmo pedido, sem duplicá-lo; pagamento recusado mantém o pedido em `pending_payment` com `payment_status = 'failed'`.
- **Voltar do Stripe não prova pagamento.** A tela de retorno consulta o pedido e reconsulta por até 30 s; quem escreve `paid` é o webhook, nunca o front.
- **Caminho do pedido depende da modalidade** (§5.3): retirada passa por `ready`, entrega passa por `out_for_delivery`. Vale no kanban, nos botões do detalhe e na linha do tempo do cliente — um pedido de entrega nunca fica "pronto para retirada".
- **A trilha de status é escrita só pela trigger** (`record_order_status_change`, `SECURITY DEFINER`). `order_status_history` não tem policy de INSERT: ninguém forja auditoria escrevendo direto na tabela.
- **`ready_at` e `finished_at` são carimbados pelo banco**, não pelo painel — o relógio da máquina do operador não decide o histórico do pedido.
- **Uma mensagem por transição, garantida pelo banco.** Índice único parcial em `notification_logs (order_id, channel, template)` com `status = 'sent'`, e a linha é *reservada antes* do envio. Parcial de propósito: envio que falhou não ocupa a vaga e pode ser retentado.
- **Notificação nunca derruba a operação.** Falha no WhatsApp não mostra erro ao operador (o pedido já mudou de status) nem faz o webhook devolver erro ao Stripe (o pedido já está pago).
- **O quadro se ressincroniza ao reconectar.** Indicador verde só quando o Realtime está de fato assinando; toda volta ao ar recarrega o quadro, porque tudo que aconteceu offline passou despercebido.
- **Preços e totais são sempre recalculados no servidor.** O carrinho manda só `itemId` e `quantity`; nome e preço do pedido são snapshots tirados do banco na hora da criação.
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

- **`create-order` não tem chave de idempotência.** O botão do checkout fica desabilitado durante o envio, mas um retry de rede pode criar dois pedidos `pending_payment` para o mesmo carrinho. Nenhum deles seria cobrado duas vezes (cada um exige sua própria sessão de pagamento), então o efeito é lixo no banco, não prejuízo. Vale resolver quando houver volume — o padrão é o cliente mandar um `Idempotency-Key` e a function reaproveitar o pedido pendente equivalente.
- **Sem limpeza de pedidos abandonados.** Pedido que fica em `pending_payment` para sempre não incomoda o kanban (ele lista por `status`), mas acumula. O evento `checkout.session.expired` já marca `failed`; falta uma rotina que cancele os antigos.
- **Arquivos órfãos nos buckets** ao trocar logo/capa/imagens várias vezes — limpar quando houver rotina de manutenção (pós-MVP).
- **A policy `orders_update_members` permite alterar qualquer coluna do pedido**, não só o status. Um funcionário poderia mudar o total pelo PostgREST. Ninguém no painel faz isso, e o valor cobrado já foi congelado no Stripe, então o risco hoje é de dado inconsistente, não de prejuízo. A correção natural entra junto com a 9.1 (papéis `manager` e `staff`): restringir a escrita às colunas de operação.
- **Notificação de cancelamento não existe.** `cancelled` está fora da matriz do §6.5 de propósito: um aviso de cancelamento sem o motivo é pior do que nenhum. Entra quando o painel oferecer cancelar com justificativa.
- **O link de avaliação ainda não vai na mensagem de "pedido finalizado"** — a página `/avaliar/:orderId` é placeholder até a 7.3. A matriz do §6.5 pede os dois juntos; hoje sai só o agradecimento.
- ~~Página temporária `/status`~~ — removida na 3.1.
- ~~Chunk > 500 kB no build~~ — resolvido com code-splitting por rota.
- ~~Trigger de histórico bloqueada pela RLS~~ — corrigida na 6.4 (`SECURITY DEFINER`).

---

## 6. Como rodar e testar localmente

`npm run dev` sobe em `http://localhost:5173`:

- **`/cantina-da-nona`** — vitrine com o restaurante do seed: home com categorias, página de itens (o "Talharim ao funghi" demonstra o estado indisponível), carrinho persistente com observação.
- **`/cantina-da-nona/checkout`** — checkout completo: alternar entre entrega e retirada mostra a taxa entrando e saindo do total; o CEP `90010-150` preenche Praça da Alfândega / Centro Histórico / Porto Alegre / RS. Com menos de R$ 30,00 no carrinho o botão fica bloqueado (pedido mínimo da Cantina). "Ir para o pagamento" leva ao Checkout do Stripe: `4242 4242 4242 4242` aprova e volta com o pedido confirmado; `4000 0000 0000 0002` recusa e o pedido fica disponível para nova tentativa.
- **`/pizzaria-do-ze`** — segundo restaurante de teste, agora com quatro itens e **seis pedidos** espalhados pelo kanban (carrinho separado do da Cantina).
- **`/admin/pedidos`** — kanban da Fase 6 (`mmr-onboard-test@gmail.com` / `RangoTeste!123`, restaurante "Pizzaria do Zé"). Arraste pela alça do card ou use os botões do detalhe. Para ver o semáforo mudar sem esperar, altere `estimated_ready_at` do pedido no Table Editor: mais de 10 min à frente = verde, menos = laranja, no passado = vermelho. Abra duas abas para ver o tempo real.
- **`/pizzaria-do-ze/pedido/<id>`** — acompanhamento pelo cliente; mover o card no painel muda a linha do tempo sozinho.
- **`/admin`** — painel completo (mesmas credenciais).
- **`/`, `/slug-inexistente`** — landing placeholder e 404 amigável da vitrine.

Detalhes no [README](../README.md#estado-atual-e-como-testar).

---

## 7. Ordem de retomada

1. **Fase 7** (e-mails e avaliação: Resend, templates transacionais, avaliação do pedido): **é o próximo passo**. Depende de você para uma coisa só — a `RESEND_API_KEY` (item F). A 7.3 também fecha o link de avaliação que hoje falta na mensagem de "pedido finalizado".
2. **Fase 8** (relatórios) não depende de credencial nenhuma e pode vir antes da 7 se preferir; `ready_at` e `finished_at` já estão sendo carimbados, então os tempos médios têm de onde sair.
3. **Fase 4 (real)** — quando as credenciais da Meta chegarem, o provedor real entra sozinho e a 4.1 fecha (item F). Até lá, as mensagens da 6.6 rodam no fake e ficam registradas em `notification_logs`.
4. **0.4** finaliza assim que a Vercel estiver conectada (independente; pode ser feita a qualquer momento).

| Marco | Significado |
|---|---|
| ✅ Fim da Fase 2 | Restaurante monta o cardápio |
| ✅ Fim da Fase 3 | Cliente navega e monta o carrinho |
| ✅ Fim da Fase 5 | Cliente paga — caminho do cliente completo |
| ✅ **Fim da Fase 6** | **MVP funcional (pedido pago e operado)** |
| Fim da Fase 9 | Pronto para produção |

---

## 8. Resumo de progresso

**36 de 50 tarefas** entregues e validadas (Fases 0 a 3, **5 e 6 inteiras**, exceto a Vercel na 0.4; **4.2 e 4.3**). A **4.1** está implementada, deployada e validada no provedor fake, mas segue **aberta** até a entrega real via Meta.

**O MVP está de pé:** pedido pago, operado no kanban e acompanhado pelo cliente. Próximo passo concreto: **Fase 7 — e-mails e avaliação**, que precisa da `RESEND_API_KEY`; ou **Fase 8 — relatórios**, se preferir seguir sem depender de credencial nova.
