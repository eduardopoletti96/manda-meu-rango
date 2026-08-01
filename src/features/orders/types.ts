import type { Database } from '@/types/database'
import type { FulfillmentType, OrderStatus } from './order-status'

export type PaymentStatus = Database['public']['Enums']['payment_status']

export type OrderItemLine = {
  id: string
  item_name: string
  unit_price: number
  quantity: number
  line_total: number | null
}

/**
 * Endereço congelado no pedido (`orders.address_snapshot`). É jsonb no banco,
 * então o tipo aqui é uma promessa, não uma garantia: o `create-order` grava
 * exatamente as colunas de `customer_addresses`, menos o id.
 */
export type AddressSnapshot = {
  label?: string | null
  zip_code?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  reference?: string | null
}

export type OrderCustomer = {
  id: string
  name: string
  phone: string
}

/** Pedido como o kanban precisa dele: com cliente e itens já embutidos. */
export type KanbanOrder = {
  id: string
  order_number: number
  status: OrderStatus
  fulfillment_type: FulfillmentType
  payment_status: PaymentStatus
  notes: string | null
  subtotal: number
  delivery_fee: number
  total: number
  address_snapshot: AddressSnapshot | null
  estimated_ready_at: string | null
  created_at: string
  ready_at: string | null
  finished_at: string | null
  customer: OrderCustomer | null
  items: OrderItemLine[]
}

/** Linha única do endereço congelado: "Rua X, 123 — Bairro, Cidade/UF". */
export function formatSnapshot(snapshot: AddressSnapshot | null): string {
  if (!snapshot) {
    return ''
  }
  const street = [snapshot.street, snapshot.number].filter(Boolean).join(', ')
  const area = [snapshot.district, [snapshot.city, snapshot.state].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(', ')
  return [street, area].filter(Boolean).join(' — ')
}
