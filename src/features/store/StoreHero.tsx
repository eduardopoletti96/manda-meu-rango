import { Clock, MapPin } from 'lucide-react'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { todayWindow } from './opening-hours'
import { useStore } from './store-context'

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'bg-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  )
}

// Capa, logo e informações do restaurante na home da vitrine (tarefa 3.2).
export function StoreHero() {
  const { restaurant, hours, openState } = useStore()
  const today = todayWindow(hours, new Date())
  const addressLine = [
    [restaurant.street, restaurant.number].filter(Boolean).join(', '),
    restaurant.district,
    [restaurant.city, restaurant.state].filter(Boolean).join(' - '),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="flex flex-col">
      <div className="relative">
        {restaurant.cover_url ? (
          <img
            src={restaurant.cover_url}
            alt=""
            className="h-36 w-full rounded-2xl border object-cover sm:h-48"
          />
        ) : (
          <div className="from-primary/25 to-secondary/25 h-36 w-full rounded-2xl bg-gradient-to-r sm:h-48" />
        )}
        {restaurant.logo_url ? (
          <img
            src={restaurant.logo_url}
            alt={`Logo de ${restaurant.name}`}
            className="border-background bg-card absolute -bottom-8 left-4 size-20 rounded-full border-4 object-cover shadow-md"
          />
        ) : null}
      </div>

      <div className={cn('flex flex-col gap-2 px-1 pt-3', restaurant.logo_url && 'pt-10')}>
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.description ? (
            <p className="text-muted-foreground text-sm">{restaurant.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {openState === 'open' ? (
            <Chip className="bg-success/15 text-success">● Aberto agora</Chip>
          ) : openState === 'closed' ? (
            <Chip className="bg-destructive/10 text-destructive">● Fechado agora</Chip>
          ) : null}
          {today ? (
            <Chip>
              <Clock className="size-3" />
              Hoje: {today.opens} às {today.closes}
            </Chip>
          ) : null}
          {restaurant.pickup_enabled ? <Chip>Retirada</Chip> : null}
          {restaurant.delivery_enabled ? (
            <Chip>
              Entrega
              {restaurant.delivery_fee > 0 ? ` ${formatBRL(restaurant.delivery_fee)}` : ' grátis'}
            </Chip>
          ) : null}
          {restaurant.min_order_value > 0 ? (
            <Chip>Pedido mínimo {formatBRL(restaurant.min_order_value)}</Chip>
          ) : null}
        </div>

        {addressLine ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" />
            {addressLine}
          </p>
        ) : null}
      </div>
    </section>
  )
}
