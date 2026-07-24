import { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

export type StoreRestaurant = Database['public']['Tables']['restaurants']['Row']
export type BusinessHour = Database['public']['Tables']['business_hours']['Row']

/** 'unknown' = restaurante sem nenhum horário configurado; tratado como aberto. */
export type OpenState = 'open' | 'closed' | 'unknown'

export type StoreContextValue = {
  restaurant: StoreRestaurant
  hours: BusinessHour[]
  openState: OpenState
}

export const StoreContext = createContext<StoreContextValue | null>(null)

// O StoreProvider só renderiza os filhos com o restaurante resolvido,
// então aqui o contexto nunca é nulo.
export function useStore(): StoreContextValue {
  const value = useContext(StoreContext)
  if (!value) {
    throw new Error('useStore deve ser usado dentro de StoreProvider.')
  }
  return value
}
