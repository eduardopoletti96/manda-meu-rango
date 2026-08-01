import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { ORDER_STATUS_LABELS, type KanbanStatus } from './order-status'

const EMPTY_MESSAGE: Record<KanbanStatus, string> = {
  placed: 'Nenhum pedido novo.',
  in_production: 'Nada na cozinha agora.',
  ready: 'Nada aguardando retirada.',
  out_for_delivery: 'Nenhuma entrega na rua.',
  finished: 'Nenhum pedido finalizado hoje.',
}

/**
 * Uma coluna do kanban: título, contador e a pilha de cards.
 *
 * Os cards chegam como children para que a coluna não precise saber o que é um
 * pedido. Ela é a área de soltura da 6.4 — o id do droppable é o próprio
 * status, que é o que o `onDragEnd` precisa saber.
 */
export function OrderColumn({
  status,
  count,
  children,
  isEmpty,
}: {
  status: KanbanStatus
  count: number
  children: ReactNode
  isEmpty: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      aria-label={ORDER_STATUS_LABELS[status]}
      className={cn(
        // min-h para que a coluna vazia continue sendo um alvo de soltura
        // confortável: sem isso ela encolhe até a altura do texto e acertá-la
        // com o card na mão vira sorte.
        'bg-muted/50 flex min-h-72 w-72 shrink-0 flex-col rounded-2xl border p-3 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{ORDER_STATUS_LABELS[status]}</h3>
        <span
          aria-label={`${count} ${count === 1 ? 'pedido' : 'pedidos'}`}
          className="bg-background text-muted-foreground min-w-6 rounded-full border px-2 py-0.5 text-center text-xs font-semibold"
        >
          {count}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {isEmpty ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-xs">
            {EMPTY_MESSAGE[status]}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
