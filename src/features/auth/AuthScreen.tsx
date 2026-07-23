import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Moldura comum das telas de autenticação do painel (login, recuperação
// e redefinição de senha): marca no topo e card centralizado.
export function AuthScreen({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <header className="text-center">
        <h1 className="text-primary text-3xl font-bold">Manda meu Rango</h1>
        <p className="text-muted-foreground text-sm">Painel do restaurante</p>
      </header>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
