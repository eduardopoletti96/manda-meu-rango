import type { ReactNode } from 'react'

// Ponto único para providers globais (TanStack Query, toasts, etc.),
// adicionados conforme as próximas fases exigirem.
export function AppProviders({ children }: { children: ReactNode }) {
  return children
}
