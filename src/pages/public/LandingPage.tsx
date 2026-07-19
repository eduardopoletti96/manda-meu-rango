import { UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-md">
          <UtensilsCrossed className="size-6" />
        </span>
        <h1 className="text-4xl font-bold">Manda meu Rango</h1>
      </div>
      <p className="text-muted-foreground max-w-md text-center">
        Cardápio digital e gestão de pedidos para o seu restaurante.
      </p>

      <Card className="w-full max-w-sm rounded-3xl shadow-lg">
        <CardHeader>
          <CardTitle>Tokens de design</CardTitle>
          <CardDescription>
            Paleta quente, cantos arredondados e tipografia display do projeto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="destructive">Destrutivo</Button>
        </CardContent>
        <CardFooter>
          <Button className="w-full rounded-2xl" size="lg">
            Adicionar ao carrinho
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
