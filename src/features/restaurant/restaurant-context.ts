import { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type RestaurantRole = Database['public']['Enums']['restaurant_role']

export type Membership = {
  role: RestaurantRole
  restaurant: Restaurant
}

export type RestaurantContextValue = {
  /** Vínculos do usuário logado, do mais antigo para o mais novo. */
  memberships: Membership[]
  /** Restaurante ativo no painel (por ora, o primeiro vínculo). */
  restaurant: Restaurant | null
  /** Papel do usuário no restaurante ativo. */
  role: RestaurantRole | null
  /** true enquanto os vínculos ainda não foram carregados. */
  loading: boolean
  error: string | null
  /** Recarrega os vínculos (ex.: após editar o perfil do restaurante). */
  refresh: () => Promise<void>
}

export const RestaurantContext = createContext<RestaurantContextValue>({
  memberships: [],
  restaurant: null,
  role: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function useRestaurant() {
  return useContext(RestaurantContext)
}
