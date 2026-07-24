import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getOpenState } from './opening-hours'
import { StoreNotFound } from './StoreNotFound'
import { StoreContext, type BusinessHour, type StoreRestaurant } from './store-context'

type StoreData = { restaurant: StoreRestaurant; hours: BusinessHour[] }

function fetchStore(slug: string) {
  return supabase.from('restaurants').select('*, business_hours(*)').eq('slug', slug).maybeSingle()
}

// Resolve o restaurante da vitrine a partir do slug da URL. A RLS só expõe
// restaurantes ativos ao público, então inativo cai no mesmo caminho do 404.
// Só renderiza os filhos com o restaurante carregado. Deve ser montado com
// key={slug}: trocar de slug remonta o provider e zera o estado.
export function StoreProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [data, setData] = useState<StoreData | null>(null)
  const [status, setStatus] = useState<'loading' | 'not-found' | 'error' | 'ready'>('loading')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    void fetchStore(slug).then(({ data: row, error }) => {
      if (cancelled) {
        return
      }
      if (error) {
        setStatus('error')
        return
      }
      if (!row) {
        setStatus('not-found')
        return
      }
      const { business_hours: hours, ...restaurant } = row
      setData({ restaurant, hours })
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Reavalia o "aberto agora" a cada minuto, sem nova consulta ao banco.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (status === 'loading') {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
        <div className="bg-muted h-12 animate-pulse rounded-xl" />
        <div className="bg-muted h-40 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted aspect-square animate-pulse rounded-2xl" />
          <div className="bg-muted aspect-square animate-pulse rounded-2xl" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="text-muted-foreground max-w-sm">
          Não foi possível carregar o restaurante. Verifique sua conexão e recarregue a página.
        </p>
      </main>
    )
  }

  if (status === 'not-found' || !data) {
    return <StoreNotFound />
  }

  return (
    <StoreContext.Provider
      value={{
        restaurant: data.restaurant,
        hours: data.hours,
        openState: getOpenState(data.hours, now),
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
