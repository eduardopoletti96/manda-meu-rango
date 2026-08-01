import type { Database } from '@/types/database'

export type OrderStatus = Database['public']['Enums']['order_status']
export type FulfillmentType = Database['public']['Enums']['fulfillment_type']

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando pagamento',
  placed: 'Pedido realizado',
  in_production: 'Em produção',
  ready: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
}

/** As cinco colunas do documento base §6.4, nesta ordem. */
export const KANBAN_COLUMNS = [
  'placed',
  'in_production',
  'ready',
  'out_for_delivery',
  'finished',
] as const

export type KanbanStatus = (typeof KANBAN_COLUMNS)[number]

export function isKanbanStatus(status: OrderStatus): status is KanbanStatus {
  return (KANBAN_COLUMNS as readonly OrderStatus[]).includes(status)
}

/** Status que ainda ocupam a operação — o kanban os mantém à vista mesmo de ontem. */
export const ACTIVE_STATUSES: OrderStatus[] = [
  'placed',
  'in_production',
  'ready',
  'out_for_delivery',
]

/**
 * Próximo status possível, conforme §5.3 do documento base.
 *
 * O caminho depende da modalidade: retirada passa por `ready`, entrega passa
 * por `out_for_delivery`. Não é uma escolha de UI — é o que a trigger
 * `validate_order_status_transition` aceita no banco, e o que faz sentido para
 * quem opera: um pedido de entrega não fica "pronto para retirada".
 *
 * Cancelamento sai daqui de propósito: vale de qualquer status ativo, mas é
 * ação explícita no detalhe do pedido, nunca resultado de arrastar um card.
 */
export function nextStatuses(status: OrderStatus, fulfillment: FulfillmentType): OrderStatus[] {
  switch (status) {
    case 'placed':
      return ['in_production']
    case 'in_production':
      return fulfillment === 'delivery' ? ['out_for_delivery'] : ['ready']
    case 'ready':
    case 'out_for_delivery':
      return ['finished']
    default:
      return []
  }
}

export function canMoveTo(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: FulfillmentType,
): boolean {
  return nextStatuses(from, fulfillment).includes(to)
}

/** Por que a coluna recusou o card — texto curto para o aviso da 6.4. */
export function rejectionReason(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: FulfillmentType,
): string {
  if (from === to) {
    return ''
  }
  if (from === 'finished' || from === 'cancelled') {
    return `Pedido ${ORDER_STATUS_LABELS[from].toLowerCase()} não muda mais de coluna.`
  }
  if (to === 'ready' && fulfillment === 'delivery') {
    return 'Pedido de entrega vai para "Saiu para entrega", não para retirada.'
  }
  if (to === 'out_for_delivery' && fulfillment === 'pickup') {
    return 'Pedido de retirada não sai para entrega.'
  }
  const allowed = nextStatuses(from, fulfillment)
  if (allowed.length === 0) {
    return 'Este pedido não tem próxima etapa.'
  }
  return `De "${ORDER_STATUS_LABELS[from]}" o pedido só pode ir para "${ORDER_STATUS_LABELS[allowed[0]]}".`
}
