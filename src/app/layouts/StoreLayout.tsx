import { Outlet, useParams } from 'react-router-dom'

// Layout das páginas da loja (/:slug/...). Ganhará header com logo,
// informações do restaurante e ícone do carrinho nas fases 3 e seguintes.
export function StoreLayout() {
  const { slug } = useParams()

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <span className="font-display text-lg font-semibold">{slug}</span>
      </header>
      <Outlet />
    </div>
  )
}
