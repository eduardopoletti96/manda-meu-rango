import { customerSupabase } from '@/lib/supabase'
import type { FulfillmentType, OrderStatus } from './order-status'
import type { AddressSnapshot, OrderItemLine, PaymentStatus } from './types'

// 6.7 — O pedido como o cliente o vê.
//
// Vai pelo PostgREST com o JWT do cliente: a policy orders_select_owner_or_member
// só devolve o pedido de quem pediu, e o mesmo vale para os itens e para o
// histórico de status. Não há filtro por cliente aqui porque não há como
// burlar mandando outro id.

export type StatusStep = {
  from_status: OrderStatus | null
  to_status: OrderStatus
  changed_at: string
}

export type TrackedOrder = {
  id: string
  order_number: number
  status: OrderStatus
  payment_status: PaymentStatus
  fulfillment_type: FulfillmentType
  notes: string | null
  subtotal: number
  delivery_fee: number
  total: number
  address_snapshot: AddressSnapshot | null
  estimated_ready_at: string | null
  created_at: string
  items: OrderItemLine[]
  history: StatusStep[]
}

const TRACKED_SELECT = `
  id, order_number, status, payment_status, fulfillment_type, notes,
  subtotal, delivery_fee, total, address_snapshot, estimated_ready_at, created_at,
  items:order_items(id, item_name, unit_price, quantity, line_total),
  history:order_status_history(from_status, to_status, changed_at)
`

export async function fetchTrackedOrder(
  token: string,
  orderId: string,
): Promise<TrackedOrder | null> {
  const { data, error } = await customerSupabase(token)
    .from('orders')
    .select(TRACKED_SELECT)
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[customer-order-api] erro ao ler pedido:', error)
    return null
  }
  if (!data) {
    return null
  }

  const order = data as unknown as TrackedOrder
  return {
    ...order,
    history: [...order.history].sort((a, b) => a.changed_at.localeCompare(b.changed_at)),
  }
}
