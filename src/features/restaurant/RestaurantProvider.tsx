import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'
import { RestaurantContext, type Membership } from './restaurant-context'

function fetchMemberships(userId: string) {
  return supabase
    .from('restaurant_users')
    .select('role, restaurant:restaurants!inner(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
}

// Carrega os restaurantes aos quais o usuário logado pertence. Montado
// dentro de RequireAuth, portanto sempre há sessão ao consultar.
export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [memberships, setMemberships] = useState<Membership[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchMemberships>>) => {
    if (result.error) {
      setError('Não foi possível carregar seus restaurantes. Recarregue a página.')
      setMemberships([])
      return
    }
    setError(null)
    setMemberships(result.data)
  }, [])

  useEffect(() => {
    if (!userId) {
      return
    }
    let cancelled = false
    void fetchMemberships(userId).then((result) => {
      if (!cancelled) {
        apply(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId, apply])

  const refresh = useCallback(async () => {
    if (userId) {
      apply(await fetchMemberships(userId))
    }
  }, [userId, apply])

  const active = memberships?.[0] ?? null

  return (
    <RestaurantContext.Provider
      value={{
        memberships: memberships ?? [],
        restaurant: active?.restaurant ?? null,
        role: active?.role ?? null,
        loading: memberships === null,
        error,
        refresh,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  )
}
