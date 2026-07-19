import { NavLink, Outlet } from 'react-router-dom'
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
  return (
    <div className="flex min-h-screen">
      <aside className="bg-card w-56 shrink-0 border-r p-4">
        <span className="font-display text-lg font-bold">Manda meu Rango</span>
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
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
