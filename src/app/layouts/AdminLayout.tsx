import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Store,
  UtensilsCrossed,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/admin/equipe', label: 'Equipe', icon: Users },
  { to: '/admin/perfil', label: 'Perfil', icon: Store },
]

function SidebarContent({
  restaurantName,
  userEmail,
  onNavigate,
  onLogout,
}: {
  restaurantName: string
  userEmail: string | undefined
  onNavigate?: () => void
  onLogout: () => void
}) {
  return (
    <>
      <div>
        <span className="font-display text-lg font-bold">Manda meu Rango</span>
        <p className="text-muted-foreground truncate text-sm" title={restaurantName}>
          {restaurantName}
        </p>
      </div>
      <nav className="mt-6 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t pt-4">
        <p className="text-muted-foreground truncate text-xs" title={userEmail}>
          {userEmail}
        </p>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut />
          Sair
        </Button>
      </div>
    </>
  )
}

// Layout do painel do restaurante: sidebar fixa no desktop, drawer no
// mobile e header com a seção atual e o atalho para a página pública.
export function AdminLayout() {
  const { session } = useAuth()
  const { restaurant, loading, error } = useRestaurant()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  const currentSection = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  return (
    <div className="min-h-screen">
      <aside className="bg-card fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r p-4 md:flex">
        <SidebarContent
          restaurantName={restaurant.name}
          userEmail={session?.user.email}
          onLogout={handleLogout}
        />
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="bg-foreground/40 absolute inset-0"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="bg-card absolute inset-y-0 left-0 flex w-60 flex-col border-r p-4">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
              aria-label="Fechar menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X />
            </Button>
            <SidebarContent
              restaurantName={restaurant.name}
              userEmail={session?.user.email}
              onNavigate={() => setMobileNavOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col md:pl-60">
        <header className="bg-background/95 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Abrir menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu />
          </Button>
          <h1 className="text-lg font-semibold">{currentSection?.label ?? 'Painel'}</h1>
          <a
            href={`/${restaurant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary ml-auto flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Ver loja
            <ExternalLink className="size-3.5" />
          </a>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
