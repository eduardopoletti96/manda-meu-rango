import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Sessão do cliente identificado por telefone (Fase 4). Diferente do carrinho,
// a identidade é global — o telefone identifica a pessoa em qualquer loja —,
// então guardamos uma única sessão, não um record por restaurante.
//
// O token é o JWT emitido pelo verify-phone-token, com o claim customer_id que
// a RLS lê. A partir da Fase 5 ele acompanha as chamadas autenticadas (ex.:
// create-order); por ora, tê-lo guardado já é o "cliente autenticado".

export type IdentifiedCustomer = {
  id: string
  name: string
  phone: string
}

export type CustomerSession = {
  token: string
  customer: IdentifiedCustomer
  /** epoch em ms; passado disso a sessão é considerada expirada. */
  expiresAt: number
}

type CustomerSessionStore = {
  session: CustomerSession | null
  setSession: (token: string, customer: IdentifiedCustomer, expiresInSeconds: number) => void
  clear: () => void
}

export const useCustomerSessionStore = create<CustomerSessionStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (token, customer, expiresInSeconds) =>
        set({ session: { token, customer, expiresAt: Date.now() + expiresInSeconds * 1000 } }),
      clear: () => set({ session: null }),
    }),
    { name: 'mmr-customer', version: 1 },
  ),
)

function activeSession(session: CustomerSession | null): CustomerSession | null {
  if (!session) {
    return null
  }
  return session.expiresAt > Date.now() ? session : null
}

/** Sessão válida (não expirada) ou null. */
export function useCustomerSession(): CustomerSession | null {
  return useCustomerSessionStore((state) => activeSession(state.session))
}

/** Cliente identificado com sessão válida, ou null. */
export function useIdentifiedCustomer(): IdentifiedCustomer | null {
  return useCustomerSession()?.customer ?? null
}
