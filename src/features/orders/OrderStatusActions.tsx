import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ORDER_STATUS_LABELS, nextStatuses, type OrderStatus } from './order-status'
import type { KanbanOrder } from './types'

/**
 * 6.4 — As mesmas transições do arrasto, em botões.
 *
 * Arrastar é o gesto do quadro no balcão; num celular, ou para quem usa
 * teclado e leitor de tela, o botão é o caminho. Os dois chamam exatamente a
 * mesma função de mover, então não existe "caminho de segunda".
 *
 * Cancelar não é uma coluna: vale de qualquer status ativo e é irreversível
 * (status terminal é imutável no banco), então pede confirmação em dois toques.
 */
export function OrderStatusActions({
  order,
  busy,
  onMove,
}: {
  order: KanbanOrder
  busy: boolean
  onMove: (order: KanbanOrder, status: OrderStatus) => void
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const forward = nextStatuses(order.status, order.fulfillment_type)
  const closed = order.status === 'finished' || order.status === 'cancelled'

  if (closed) {
    return (
      <p className="text-muted-foreground text-sm">
        Pedido {ORDER_STATUS_LABELS[order.status].toLowerCase()} — não muda mais de status.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      {forward.map((status) => (
        <Button key={status} disabled={busy} onClick={() => onMove(order, status)}>
          Mover para "{ORDER_STATUS_LABELS[status]}"
        </Button>
      ))}

      {confirmingCancel ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => setConfirmingCancel(false)}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={busy}
            onClick={() => onMove(order, 'cancelled')}
          >
            Confirmar cancelamento
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => setConfirmingCancel(true)}
        >
          Cancelar pedido
        </Button>
      )}
    </div>
  )
}
