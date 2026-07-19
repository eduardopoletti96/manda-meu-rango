import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">Ops! Essa página não existe ou saiu do cardápio.</p>
      <Button asChild className="rounded-2xl">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
