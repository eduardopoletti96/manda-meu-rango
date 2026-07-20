import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { StoreLayout } from './layouts/StoreLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
// TEMPORÁRIO: página de diagnóstico da conexão com o Supabase (remover na Fase 3).
import { StatusPage } from '@/pages/StatusPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { StoreHomePage } from '@/pages/store/StoreHomePage'
import { CategoryPage } from '@/pages/store/CategoryPage'
import { CartPage } from '@/pages/store/CartPage'
import { CheckoutPage } from '@/pages/store/CheckoutPage'
import { OrderTrackingPage } from '@/pages/store/OrderTrackingPage'
import { ReviewPage } from '@/pages/store/ReviewPage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { MenuAdminPage } from '@/pages/admin/MenuAdminPage'
import { ProfileAdminPage } from '@/pages/admin/ProfileAdminPage'
import { OrdersKanbanPage } from '@/pages/admin/OrdersKanbanPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'
import { TeamPage } from '@/pages/admin/TeamPage'

// Estrutura de rotas conforme docs/PROJETO_Manda_meu_Rango.md §3.
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ path: '/', element: <LandingPage /> }],
  },
  // TEMPORÁRIO: diagnóstico de conexão com o Supabase (remover na Fase 3).
  { path: '/status', element: <StatusPage /> },
  { path: '/admin/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'cardapio', element: <MenuAdminPage /> },
      { path: 'perfil', element: <ProfileAdminPage /> },
      { path: 'pedidos', element: <OrdersKanbanPage /> },
      { path: 'relatorios', element: <ReportsPage /> },
      { path: 'equipe', element: <TeamPage /> },
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
