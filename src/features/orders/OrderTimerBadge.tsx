import { Check, Clock, TriangleAlert } from 'lucide-react'
import { formatElapsed, useOrderTimer, type TimedOrder } from '@/hooks/useOrderTimer'
import { cn } from '@/lib/utils'

const STYLES = {
  green: 'bg-success/15 text-foreground',
  orange: 'bg-warning/25 text-foreground',
  red: 'bg-destructive/15 text-destructive',
  stopped: 'bg-muted text-muted-foreground',
} as const

/** O que a cor quer dizer — vai no title e no leitor de tela. */
function describe(level: keyof typeof STYLES, elapsed: string): string {
  switch (level) {
    case 'green':
      return `${elapsed} de preparo, dentro do prazo`
    case 'orange':
      return `${elapsed} de preparo, faltam menos de 10 minutos para a previsão`
    case 'red':
      return `${elapsed} de preparo, previsão estourada`
    case 'stopped':
      return `${elapsed} até o pedido sair da produção`
  }
}

/** 6.3 — Tempo decorrido com o semáforo de cores do documento base §6.4. */
export function OrderTimerBadge({ order }: { order: TimedOrder }) {
  const { elapsedMs, level } = useOrderTimer(order)
  const elapsed = formatElapsed(elapsedMs)
  const description = describe(level, elapsed)
  const Icon = level === 'red' ? TriangleAlert : level === 'stopped' ? Check : Clock

  return (
    <span
      title={description}
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
        STYLES[level],
      )}
    >
      <Icon aria-hidden className="size-3" />
      {elapsed}
      <span className="sr-only">{description}</span>
    </span>
  )
}
