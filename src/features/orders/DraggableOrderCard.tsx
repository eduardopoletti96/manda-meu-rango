import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { OrderCard } from './OrderCard'
import type { KanbanOrder } from './types'

/**
 * 6.4 — O card com alça de arrastar.
 *
 * A alça é um botão separado, como na lista do cardápio (2.6): o corpo do card
 * abre o detalhe e só a alça move o pedido. Sem essa separação, o mesmo gesto
 * teria que decidir entre abrir e arrastar — e no toque isso sempre erra.
 * A alça também é o que dá arrasto por teclado (setas, com Espaço para pegar
 * e soltar) através do KeyboardSensor.
 */
export function DraggableOrderCard({
  order,
  onOpen,
  highlighted,
}: {
  order: KanbanOrder
  onOpen: () => void
  highlighted?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform), zIndex: 10 } : undefined}
    >
      <OrderCard
        order={order}
        onOpen={onOpen}
        isDragging={isDragging}
        highlighted={highlighted}
        handle={
          <button
            type="button"
            aria-label={`Mover pedido ${order.order_number}`}
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none rounded p-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  )
}
