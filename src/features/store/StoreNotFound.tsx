import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

// Slug que não corresponde a nenhum restaurante ativo (tarefa 3.1).
export function StoreNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <span aria-hidden className="text-6xl">
        🍽️
      </span>
      <h1 className="text-3xl font-bold">Restaurante não encontrado</h1>
      <p className="text-muted-foreground max-w-sm">
        O endereço pode estar incorreto ou o restaurante não está mais disponível. Confira o link
        que você recebeu.
      </p>
      <Button asChild className="rounded-2xl">
        <Link to="/">Ir para o início</Link>
      </Button>
    </main>
  )
}
