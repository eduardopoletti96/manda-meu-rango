import { Bike, ShoppingBag } from 'lucide-react'
import { formatBRL, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { OrderTimerBadge } from './OrderTimerBadge'
import { formatSnapshot, type KanbanOrder } from './types'

const MAX_VISIBLE_ITEMS = 3

/** Etiqueta da modalidade: o operador precisa distinguir de longe. */
export function FulfillmentBadge({ order }: { order: KanbanOrder }) {
  const isDelivery = order.fulfillment_type === 'delivery'
  const Icon = isDelivery ? Bike : ShoppingBag
  return (
    <span
      className={cn(
        'text-foreground flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        isDelivery ? 'bg-accent/25' : 'bg-secondary/30',
      )}
    >
      <Icon aria-hidden className="size-3" />
      {isDelivery ? 'Entrega' : 'Retirada'}
    </span>
  )
}

/**
 * 6.2 — Card do pedido no kanban, com tudo que o documento base §6.4 pede:
 * número, cliente, hora, previsão, destino, resumo dos itens e total.
 *
 * O card inteiro abre o detalhe. Na 6.4 ele ganha uma alça de arrastar —
 * separada do clique de propósito, para que abrir o detalhe e mover de coluna
 * não disputem o mesmo gesto.
 */
export function OrderCard({
  order,
  onOpen,
  handle,
  isDragging,
  highlighted,
}: {
  order: KanbanOrder
  onOpen: () => void
  handle?: React.ReactNode
  isDragging?: boolean
  highlighted?: boolean
}) {
  const visible = order.items.slice(0, MAX_VISIBLE_ITEMS)
  const hidden = order.items.length - visible.length
  const destination =
    order.fulfillment_type === 'delivery'
      ? formatSnapshot(order.address_snapshot) || 'Endereço não informado'
      : 'Retirada no balcão'

  return (
    <article
      className={cn(
        'bg-card flex flex-col gap-2 rounded-xl border p-3 text-left transition-shadow',
        isDragging && 'opacity-60 shadow-lg',
        highlighted && 'ring-primary ring-2',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
          aria-label={`Detalhes do pedido ${order.order_number}`}
        >
          <p className="truncate text-sm font-semibold">
            #{order.order_number} · {order.customer?.name ?? 'Cliente'}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatTime(order.created_at)}
            {order.estimated_ready_at ? ` · previsão ${formatTime(order.estimated_ready_at)}` : ''}
          </p>
        </button>
        {handle}
      </div>

      <div className="flex items-center gap-2">
        <FulfillmentBadge order={order} />
        <OrderTimerBadge order={order} />
      </div>

      <p className="text-muted-foreground line-clamp-2 text-xs" title={destination}>
        {destination}
      </p>

      <ul className="text-xs">
        {visible.map((item) => (
          <li key={item.id} className="truncate">
            <span className="font-medium">{item.quantity}×</span> {item.item_name}
          </li>
        ))}
        {hidden > 0 ? (
          <li className="text-muted-foreground">
            +{hidden} {hidden === 1 ? 'item' : 'itens'}
          </li>
        ) : null}
      </ul>

      <p className="text-sm font-semibold">{formatBRL(order.total)}</p>
    </article>
  )
}
