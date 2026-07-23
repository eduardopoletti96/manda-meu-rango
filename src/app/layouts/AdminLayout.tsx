import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/cardapio', label: 'Cardápio' },
  { to: '/admin/relatorios', label: 'Relatórios' },
  { to: '/admin/equipe', label: 'Equipe' },
  { to: '/admin/perfil', label: 'Perfil' },
]

// Layout do painel do restaurante. A sidebar definitiva com dados do
// restaurante logado chega na tarefa 2.3.
export function AdminLayout() {
  const { session } = useAuth()
  const { restaurant, loading, error } = useRestaurant()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  // Conta sem restaurante: segue para o onboarding antes de usar o painel.
  if (!restaurant) {
    return <Navigate to="/admin/onboarding" replace />
  }

  return (
    <div className="flex min-h-screen">
      <aside className="bg-card flex w-56 shrink-0 flex-col border-r p-4">
        <span className="font-display text-lg font-bold">Manda meu Rango</span>
        <p className="text-muted-foreground truncate text-sm" title={restaurant.name}>
          {restaurant.name}
        </p>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t pt-4">
          <p className="text-muted-foreground truncate text-xs" title={session?.user.email}>
            {session?.user.email}
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
