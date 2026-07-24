import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'

// Protege as rotas do painel: sem sessão, redireciona para o login
// guardando a rota de origem para voltar a ela após autenticar.
// Sem children, funciona como layout route e renderiza o <Outlet />.
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children ?? <Outlet />
}
