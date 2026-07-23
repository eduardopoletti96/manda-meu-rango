import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthContextValue = {
  /** Sessão atual do Supabase Auth; null quando deslogado. */
  session: Session | null
  /** true enquanto a sessão persistida ainda não foi restaurada do storage. */
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}
