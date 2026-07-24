import { useEffect } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { CartIndicator } from '@/features/cart/CartIndicator'
import { StoreProvider } from '@/features/store/StoreProvider'
import { useStore } from '@/features/store/store-context'
import { todayWindow } from '@/features/store/opening-hours'

function ClosedBanner() {
  const { hours, openState } = useStore()
  if (openState !== 'closed') {
    return null
  }
  const today = todayWindow(hours, new Date())
  return (
    <div className="bg-warning/15 text-foreground border-warning/40 border-b px-4 py-2 text-center text-sm">
      <strong>Estamos fechados agora.</strong>{' '}
      {today
        ? `Hoje o atendimento é das ${today.opens} às ${today.closes}.`
        : 'Não abrimos hoje — confira os horários na página do restaurante.'}
    </div>
  )
}

function StoreShell() {
  const { restaurant } = useStore()

  useEffect(() => {
    document.title = `${restaurant.name} · Manda meu Rango`
  }, [restaurant.name])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link to={`/${restaurant.slug}`} className="flex min-w-0 items-center gap-2">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt=""
                className="size-8 shrink-0 rounded-full border object-cover"
              />
            ) : null}
            <span className="font-display truncate text-lg font-semibold">{restaurant.name}</span>
          </Link>
          <CartIndicator />
        </div>
      </header>
      <ClosedBanner />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}

// Layout das páginas da loja (/:slug/...): resolve o restaurante pelo slug
// e envolve as páginas com o contexto da vitrine (tarefa 3.1).
export function StoreLayout() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) {
    return null
  }
  return (
    <StoreProvider key={slug} slug={slug}>
      <StoreShell />
    </StoreProvider>
  )
}
