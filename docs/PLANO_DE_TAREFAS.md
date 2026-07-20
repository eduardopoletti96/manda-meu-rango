# Manda meu Rango — Plano de Tarefas

Cada tarefa é uma entrega pequena, testável e independente. Ao concluir uma tarefa: marcar o checkbox, validar os critérios de aceite e **fazer o commit sugerido**. É seguro parar o desenvolvimento ao final de qualquer tarefa.

**Legenda de esforço:** P = até 2h · M = meio dia · G = 1 dia ou mais

---

## Fase 0 — Fundação (setup)

### [x] 0.1 — Inicializar repositório e projeto (P)
Criar repo no GitHub, iniciar Vite + React + TypeScript, configurar ESLint, Prettier, `.gitignore` e `.env.example`.
**Aceite:** `npm run dev` sobe a aplicação; lint passa sem erros.
**Commit:** `chore(setup): inicializa projeto React + TypeScript com Vite`

### [x] 0.2 — Configurar Tailwind, tokens de design e shadcn/ui (P)
Instalar Tailwind, aplicar a paleta do documento base como CSS variables, configurar fontes e raios arredondados, instalar shadcn/ui.
**Aceite:** página de exemplo renderiza botão e card com o estilo do projeto.
**Commit:** `feat(ui): configura Tailwind, tokens de design e shadcn/ui`

### [x] 0.3 — Criar projeto Supabase e client (P)
Criar projeto, configurar `src/lib/supabase.ts`, variáveis de ambiente e script de geração de tipos.
**Aceite:** conexão validada com uma query de teste.
**Commit:** `chore(supabase): configura projeto e client do Supabase`

### [ ] 0.4 — Deploy inicial na Vercel (P)
Conectar repo à Vercel, configurar variáveis de ambiente e preview por PR.
**Aceite:** URL de produção acessível com a página inicial.
**Commit:** `chore(deploy): configura deploy contínuo na Vercel`

### [x] 0.5 — Estrutura de pastas e roteamento base (P)
Criar a árvore de pastas do documento base, instalar React Router com rotas placeholder e layouts (público, loja, admin).
**Aceite:** navegação entre `/`, `/:slug` e `/admin` funciona.
**Commit:** `feat(app): define estrutura de pastas e roteamento base`

---

## Fase 1 — Banco de dados

### [x] 1.1 — Migration: restaurantes e usuários (M)
Tabelas `restaurants`, `restaurant_users`, `business_hours` + enums de papel.
**Aceite:** migration aplica e reverte sem erro; slug é único.
**Commit:** `feat(db): cria tabelas de restaurantes, usuários e horários`

### [x] 1.2 — Migration: cardápio (P)
Tabelas `categories` e `menu_items` com ordenação e flags de disponibilidade.
**Aceite:** FKs e índices por `restaurant_id` criados.
**Commit:** `feat(db): cria tabelas de categorias e itens do cardápio`

### [x] 1.3 — Migration: clientes e endereços (P)
Tabelas `customers`, `customer_addresses`, `phone_verifications`.
**Aceite:** telefone único em formato E.164; token com expiração.
**Commit:** `feat(db): cria tabelas de clientes, endereços e verificação de telefone`

### [x] 1.4 — Migration: pedidos (M)
Tabelas `orders`, `order_items`, `order_status_history`, `reviews`, `notification_logs` + enums de status.
**Aceite:** numeração sequencial por restaurante funciona; trigger de histórico grava mudanças de status.
**Commit:** `feat(db): cria tabelas de pedidos, itens, histórico e avaliações`

### [x] 1.5 — Políticas RLS (M)
Habilitar RLS em todas as tabelas e escrever as políticas conforme seção 5.4 do documento base.
**Aceite:** testes manuais confirmam que um restaurante não lê dados de outro e que cliente só vê os próprios pedidos.
**Commit:** `feat(db): aplica políticas de RLS multi-tenant`

### [x] 1.6 — Buckets de Storage e seed (P)
Buckets `logos`, `covers`, `categories`, `items` com políticas; script `seed.sql` com um restaurante fictício completo.
**Aceite:** upload público de leitura e escrita restrita; seed popula dados de teste.
**Commit:** `feat(db): configura buckets de storage e dados de seed`

---

## Fase 2 — Painel do restaurante

### [ ] 2.1 — Login por e-mail e senha (M)
Tela `/admin/login`, Supabase Auth, rotas protegidas, logout, recuperação de senha.
**Aceite:** usuário não autenticado é redirecionado; sessão persiste no refresh.
**Commit:** `feat(auth): implementa login e proteção de rotas do painel`

### [ ] 2.2 — Cadastro de restaurante e onboarding (M)
Fluxo de criação de conta com definição de slug (com validação de disponibilidade) e dados básicos.
**Aceite:** ao concluir, o usuário vira `owner` do restaurante criado.
**Commit:** `feat(admin): cria fluxo de cadastro e onboarding de restaurante`

### [ ] 2.3 — Layout do painel e dashboard (P)
Sidebar, header com nome do restaurante, cards de resumo (pedidos hoje, faturamento, ticket médio).
**Aceite:** layout responsivo; navegação entre todas as seções.
**Commit:** `feat(admin): implementa layout do painel e dashboard inicial`

### [ ] 2.4 — Perfil do restaurante (M)
Edição de dados, contato, endereço, taxa de entrega, pedido mínimo, tempo médio de preparo, horários e uploads de logo e capa.
**Aceite:** alterações refletem imediatamente na página pública.
**Commit:** `feat(admin): implementa edição do perfil e identidade visual do restaurante`

### [ ] 2.5 — CRUD de categorias (M)
Listagem, criação, edição, exclusão, upload de imagem, ativar/desativar e reordenação por drag-and-drop.
**Aceite:** ordem persistida; exclusão bloqueada ou em cascata com aviso quando há itens.
**Commit:** `feat(cardapio): implementa CRUD de categorias`

### [ ] 2.6 — CRUD de itens (M)
Itens dentro da categoria com nome, descrição, imagem, preço, disponibilidade e ordenação.
**Aceite:** preço validado; item marcado como indisponível não aparece para o cliente.
**Commit:** `feat(cardapio): implementa CRUD de itens do cardápio`

---

## Fase 3 — Vitrine do cliente

### [ ] 3.1 — Resolução de restaurante por slug (P)
Carregar dados do restaurante pela URL, tratar 404 e estado de "fechado agora".
**Aceite:** slug inexistente exibe página amigável de não encontrado.
**Commit:** `feat(loja): carrega restaurante a partir do slug na URL`

### [ ] 3.2 — Header e grid de categorias (M)
Capa, logo, informações do restaurante e grid de categorias em 2 colunas com quadros (título + imagem).
**Aceite:** grid responsivo, imagens com lazy loading e skeleton de carregamento.
**Commit:** `feat(loja): implementa header e grid de categorias`

### [ ] 3.3 — Listagem de itens e seletor de quantidade (M)
Página da categoria com cards de item (nome, imagem, preço) e controle de quantidade com adicionar ao carrinho.
**Aceite:** feedback visual ao adicionar; item indisponível aparece bloqueado.
**Commit:** `feat(loja): implementa listagem de itens com seleção de quantidade`

### [ ] 3.4 — Estado do carrinho e ícone no header (M)
Store Zustand com persistência em localStorage, isolada por restaurante; badge com contagem de itens no header, clicável.
**Aceite:** carrinho sobrevive ao refresh; trocar de restaurante não mistura itens.
**Commit:** `feat(carrinho): cria store do carrinho e indicador no header`

### [ ] 3.5 — Tela do carrinho (M)
Lista de itens com ajuste de quantidade e remoção, valor total, botão limpar carrinho, campo de observação, botão finalizar e estado vazio.
**Aceite:** total recalcula corretamente; estado vazio exibe mensagem e link para o cardápio.
**Commit:** `feat(carrinho): implementa tela do carrinho com total e observação`

---

## Fase 4 — Identificação do cliente

### [ ] 4.1 — Integração com API de WhatsApp (M)
Edge Function `send-whatsapp` com templates, registro em `notification_logs` e retry.
**Aceite:** mensagem de teste entregue e registrada no log.
**Commit:** `feat(whatsapp): integra API de envio de mensagens`

### [ ] 4.2 — Envio e validação do token (M)
Edge Functions `send-phone-token` e `verify-phone-token` com hash, expiração de 5 min, rate limit e limite de tentativas.
**Aceite:** token expirado ou incorreto é rejeitado com mensagem clara.
**Commit:** `feat(auth): implementa verificação de telefone por token no WhatsApp`

### [ ] 4.3 — Tela de identificação do cliente (M)
Formulário de nome e telefone com máscara, tela de digitação do código com reenvio por contador.
**Aceite:** ao validar, cliente fica autenticado e o carrinho é preservado.
**Commit:** `feat(auth): cria telas de identificação e confirmação do cliente`

---

## Fase 5 — Checkout, endereço e pagamento

### [ ] 5.1 — Seleção de retirada ou entrega (P)
Etapa inicial do checkout respeitando as modalidades habilitadas pelo restaurante.
**Aceite:** taxa de entrega entra no total apenas quando entrega é escolhida.
**Commit:** `feat(checkout): implementa escolha entre retirada e entrega`

### [ ] 5.2 — Modal de endereço com busca por CEP (M)
Consulta ao ViaCEP preenchendo logradouro, bairro, cidade e UF; número e complemento manuais; fallback para preenchimento manual.
**Aceite:** CEP inválido exibe erro; endereço é salvo em `customer_addresses`.
**Commit:** `feat(checkout): implementa cadastro de endereço com busca por CEP`

### [ ] 5.3 — Lista e seleção de endereços salvos (P)
Escolher endereço existente, definir padrão, editar e excluir.
**Aceite:** endereço padrão vem pré-selecionado.
**Commit:** `feat(checkout): implementa seleção de endereços salvos`

### [ ] 5.4 — Criação do pedido no servidor (M)
Edge Function `create-order`: revalida preços no banco, recalcula subtotal, taxa e total, calcula `estimated_ready_at` e grava o pedido como `pending`.
**Aceite:** manipular preços no front não altera o valor cobrado.
**Commit:** `feat(pedidos): implementa criação de pedido com cálculo no servidor`

### [ ] 5.5 — Integração com Stripe (G)
Edge Function que cria a sessão/PaymentIntent, tela de pagamento e páginas de retorno de sucesso e cancelamento.
**Aceite:** pagamento de teste conclui e retorna à aplicação.
**Commit:** `feat(pagamento): integra Stripe no fluxo de checkout`

### [ ] 5.6 — Webhook do Stripe (M)
Edge Function idempotente que confirma pagamento, muda `payment_status` para `paid` e o pedido para `placed`.
**Aceite:** evento duplicado não gera pedido duplicado; falha de pagamento marca `failed`.
**Commit:** `feat(pagamento): implementa webhook de confirmação do Stripe`

---

## Fase 6 — Operação de pedidos

### [ ] 6.1 — Estrutura do kanban (M)
Cinco colunas com carregamento dos pedidos do dia e contadores por coluna.
**Aceite:** pedidos aparecem na coluna correta pelo status.
**Commit:** `feat(pedidos): cria estrutura do kanban de acompanhamento`

### [ ] 6.2 — Card do pedido (M)
Número, cliente, hora do pedido, previsão de entrega, endereço ou etiqueta de retirada, itens e total; detalhe em modal.
**Aceite:** card exibe todas as informações da seção 6.4 do documento base.
**Commit:** `feat(pedidos): implementa card de pedido com detalhes`

### [ ] 6.3 — Timer com semáforo de cores (M)
Hook `useOrderTimer` contando desde `created_at`; verde, laranja a 10 min da previsão, vermelho após o prazo; para em `ready` e em `finished`.
**Aceite:** cores mudam corretamente em teste com previsão manipulada.
**Commit:** `feat(pedidos): implementa timer com indicação de atraso por cores`

### [ ] 6.4 — Movimentação entre colunas (M)
Drag-and-drop com validação das transições permitidas, atualização otimista e registro em `order_status_history`.
**Aceite:** transição inválida é bloqueada com aviso.
**Commit:** `feat(pedidos): implementa movimentação de pedidos entre colunas`

### [ ] 6.5 — Realtime e alerta de novo pedido (M)
Subscription do Supabase Realtime, som e destaque visual ao chegar pedido novo.
**Aceite:** dois navegadores abertos refletem a mesma mudança em segundos.
**Commit:** `feat(pedidos): adiciona atualização em tempo real e alerta de novo pedido`

### [ ] 6.6 — Notificações automáticas por status (M)
Disparo de WhatsApp em cada mudança de status conforme a matriz da seção 6.5.
**Aceite:** cada transição gera exatamente uma mensagem registrada em log.
**Commit:** `feat(notificacoes): dispara mensagens de WhatsApp por mudança de status`

### [ ] 6.7 — Acompanhamento do pedido pelo cliente (M)
Página `/:slug/pedido/:orderId` com linha do tempo do status em tempo real.
**Aceite:** cliente acompanha sem precisar recarregar a página.
**Commit:** `feat(loja): cria página de acompanhamento do pedido pelo cliente`

---

## Fase 7 — E-mails e avaliação

### [ ] 7.1 — Integração com Resend (P)
Edge Function `send-email` com layout base e registro em log.
**Aceite:** e-mail de teste entregue com o visual do projeto.
**Commit:** `feat(email): integra Resend para envio de e-mails transacionais`

### [ ] 7.2 — E-mails transacionais (M)
Confirmação de pedido ao cliente, aviso de novo pedido ao restaurante, boas-vindas e recuperação de senha.
**Aceite:** todos os templates renderizam corretamente em desktop e mobile.
**Commit:** `feat(email): cria templates transacionais de pedido e conta`

### [ ] 7.3 — Avaliação do pedido (M)
Link de avaliação enviado ao finalizar, página com nota de 1 a 5 e comentário, exibição da média no painel.
**Aceite:** uma avaliação por pedido; link expira após uso.
**Commit:** `feat(avaliacao): implementa avaliação do pedido pelo cliente`

---

## Fase 8 — Relatórios

### [ ] 8.1 — Views e funções de agregação (M)
Views no Postgres para faturamento, ticket médio, ranking de itens, tempos médios e taxa de atraso.
**Aceite:** números batem com conferência manual sobre o seed.
**Commit:** `feat(relatorios): cria views de agregação de vendas`

### [ ] 8.2 — Tela de relatórios (M)
Filtro por período, cards de indicadores, gráficos de faturamento e de itens mais vendidos.
**Aceite:** filtros aplicam a todos os blocos da tela.
**Commit:** `feat(relatorios): implementa tela de relatórios de vendas`

### [ ] 8.3 — Exportação em CSV (P)
Download dos dados do período filtrado.
**Aceite:** arquivo abre corretamente em planilha com acentuação preservada.
**Commit:** `feat(relatorios): adiciona exportação de relatórios em CSV`

---

## Fase 9 — Refinamento e lançamento

### [ ] 9.1 — Gestão de equipe (P)
Convite de usuários por e-mail com papéis `manager` e `staff`.
**Aceite:** usuário `staff` acessa apenas o kanban.
**Commit:** `feat(admin): implementa gestão de equipe e papéis`

### [ ] 9.2 — Estados de carregamento, erro e vazio (M)
Skeletons, error boundaries, páginas 404 e 500, toasts padronizados.
**Aceite:** nenhuma tela fica em branco durante carregamento ou falha.
**Commit:** `feat(ux): padroniza estados de carregamento, erro e vazio`

### [ ] 9.3 — Acessibilidade e responsividade (M)
Auditoria de contraste, foco, navegação por teclado e testes de 360 px a 1920 px.
**Aceite:** Lighthouse de acessibilidade acima de 90.
**Commit:** `fix(a11y): corrige acessibilidade e ajustes de responsividade`

### [ ] 9.4 — Performance e SEO (M)
Otimização de imagens, code splitting por rota, meta tags e Open Graph por restaurante.
**Aceite:** LCP abaixo de 2,5 s em 4G simulado.
**Commit:** `perf(loja): otimiza carregamento e metadados das páginas públicas`

### [ ] 9.5 — Observabilidade (P)
Sentry no front, logs estruturados nas Edge Functions e alerta de webhook com falha.
**Aceite:** erro forçado aparece no painel de monitoramento.
**Commit:** `chore(observabilidade): adiciona monitoramento de erros e logs`

### [ ] 9.6 — Documentação e go-live (M)
README com setup local, runbook de deploy, checklist de produção, migração do Stripe para modo live e domínio customizado.
**Aceite:** um desenvolvedor novo sobe o projeto seguindo apenas o README.
**Commit:** `docs(projeto): documenta setup, deploy e checklist de produção`

---

## Resumo

| Fase | Tarefas |
|---|---|
| 0 — Fundação | 5 |
| 1 — Banco de dados | 6 |
| 2 — Painel do restaurante | 6 |
| 3 — Vitrine do cliente | 5 |
| 4 — Identificação do cliente | 3 |
| 5 — Checkout e pagamento | 6 |
| 6 — Operação de pedidos | 7 |
| 7 — E-mails e avaliação | 3 |
| 8 — Relatórios | 3 |
| 9 — Refinamento e lançamento | 6 |
| **Total** | **50** |

**Marcos:**
- **Fim da Fase 2** — restaurante consegue montar o cardápio
- **Fim da Fase 3** — cliente navega e monta o carrinho
- **Fim da Fase 6** — fluxo completo de pedido pago e operado (MVP funcional)
- **Fim da Fase 9** — pronto para produção
