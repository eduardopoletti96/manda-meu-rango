import type { ReactNode } from 'react'
import { AuthProvider } from '@/features/auth/AuthProvider'

// Ponto único para providers globais (TanStack Query, toasts, etc.),
// adicionados conforme as próximas fases exigirem.
export function AppProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
