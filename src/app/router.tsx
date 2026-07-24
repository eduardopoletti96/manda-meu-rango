import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RestaurantProvider } from '@/features/restaurant/RestaurantProvider'
import { PublicLayout } from './layouts/PublicLayout'
import { StoreLayout } from './layouts/StoreLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { StoreHomePage } from '@/pages/store/StoreHomePage'
import { CategoryPage } from '@/pages/store/CategoryPage'
import { CartPage } from '@/pages/store/CartPage'
import { CheckoutPage } from '@/pages/store/CheckoutPage'
import { OrderTrackingPage } from '@/pages/store/OrderTrackingPage'
import { ReviewPage } from '@/pages/store/ReviewPage'

// Estrutura de rotas conforme docs/PROJETO_Manda_meu_Rango.md §3.
// As páginas do painel carregam sob demanda (route.lazy): a vitrine é o
// caminho crítico do cliente e fica no chunk principal.
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ path: '/', element: <LandingPage /> }],
  },
  {
    path: '/admin/login',
    lazy: async () => ({ Component: (await import('@/pages/admin/LoginPage')).LoginPage }),
  },
  {
    path: '/admin/cadastro',
    lazy: async () => ({ Component: (await import('@/pages/admin/SignUpPage')).SignUpPage }),
  },
  {
    path: '/admin/recuperar-senha',
    lazy: async () => ({
      Component: (await import('@/pages/admin/ForgotPasswordPage')).ForgotPasswordPage,
    }),
  },
  {
    path: '/admin/redefinir-senha',
    lazy: async () => ({
      Component: (await import('@/pages/admin/ResetPasswordPage')).ResetPasswordPage,
    }),
  },
  {
    path: '/admin/onboarding',
    element: <RequireAuth />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/pages/admin/OnboardingPage')).OnboardingPage,
        }),
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <RestaurantProvider>
          <AdminLayout />
        </RestaurantProvider>
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/pages/admin/DashboardPage')).DashboardPage,
        }),
      },
      {
        path: 'cardapio',
        lazy: async () => ({
          Component: (await import('@/pages/admin/MenuAdminPage')).MenuAdminPage,
        }),
      },
      {
        path: 'cardapio/:categoriaId',
        lazy: async () => ({
          Component: (await import('@/pages/admin/CategoryItemsAdminPage')).CategoryItemsAdminPage,
        }),
      },
      {
        path: 'perfil',
        lazy: async () => ({
          Component: (await import('@/pages/admin/ProfileAdminPage')).ProfileAdminPage,
        }),
      },
      {
        path: 'pedidos',
        lazy: async () => ({
          Component: (await import('@/pages/admin/OrdersKanbanPage')).OrdersKanbanPage,
        }),
      },
      {
        path: 'relatorios',
        lazy: async () => ({
          Component: (await import('@/pages/admin/ReportsPage')).ReportsPage,
        }),
      },
      {
        path: 'equipe',
        lazy: async () => ({ Component: (await import('@/pages/admin/TeamPage')).TeamPage }),
      },
    ],
  },
  {
    path: '/:slug',
    element: <StoreLayout />,
    children: [
      { index: true, element: <StoreHomePage /> },
      { path: 'categoria/:categoriaId', element: <CategoryPage /> },
      { path: 'carrinho', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'pedido/:orderId', element: <OrderTrackingPage /> },
      { path: 'avaliar/:orderId', element: <ReviewPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
