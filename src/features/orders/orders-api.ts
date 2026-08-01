import { supabase } from '@/lib/supabase'
import { ACTIVE_STATUSES, type OrderStatus } from './order-status'
import type { KanbanOrder } from './types'

// 6.1 — Leitura dos pedidos do kanban.
//
// Vai direto ao PostgREST: a policy orders_select_owner_or_member já limita o
// resultado ao restaurante de quem está logado, e customers_select_restaurant_members
// (migration 20260801120000) é o que permite trazer o nome do cliente junto.

const ORDER_SELECT = `
  id, order_number, status, fulfillment_type, payment_status, notes,
  subtotal, delivery_fee, total, address_snapshot,
  estimated_ready_at, created_at, ready_at, finished_at,
  customer:customers(id, name, phone),
  items:order_items(id, item_name, unit_price, quantity, line_total)
`

export type OrdersResult<T> = { ok: true; data: T } | { ok: false; error: string }

function failure(message: string, error: unknown): { ok: false; error: string } {
  console.error(`[orders-api] ${message}`, error)
  return { ok: false, error: message }
}

/** Meia-noite local: o "dia" do restaurante é o do relógio de quem opera. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Pedidos do dia mais os que continuam em aberto.
 *
 * O aceite fala em "pedidos do dia", mas um pedido feito 23h50 e ainda em
 * produção à 00h10 não pode sumir do quadro na virada — daí o `or` com os
 * status ativos. `pending_payment` fica de fora sempre: checkout abandonado
 * não é pedido a produzir (é a razão de o estado existir, ver 5.4).
 */
export async function fetchKanbanOrders(
  restaurantId: string,
  since: Date = startOfToday(),
): Promise<OrdersResult<KanbanOrder[]>> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('restaurant_id', restaurantId)
    .neq('status', 'pending_payment')
    .or(`created_at.gte.${since.toISOString()},status.in.(${ACTIVE_STATUSES.join(',')})`)
    .order('created_at', { ascending: true })

  if (error) {
    return failure('Não foi possível carregar os pedidos. Recarregue a página.', error)
  }
  return { ok: true, data: (data ?? []) as unknown as KanbanOrder[] }
}

/** Um pedido específico, no mesmo formato do quadro (usado pelo Realtime da 6.5). */
export async function fetchOrderById(
  restaurantId: string,
  orderId: string,
): Promise<KanbanOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('restaurant_id', restaurantId)
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[orders-api] erro ao reler pedido:', error)
    return null
  }
  return (data as unknown as KanbanOrder | null) ?? null
}

/**
 * Muda o status do pedido. Quem valida a transição de verdade é a trigger
 * `validate_order_status_transition` — este update só falha quando a mudança
 * é impossível, e é isso que o painel mostra ao operador.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<OrdersResult<null>> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)

  if (error) {
    return failure('Não foi possível mudar o status do pedido.', error)
  }
  return { ok: true, data: null }
}

/**
 * 6.6 — Pede o aviso de WhatsApp da transição que acabou de acontecer.
 *
 * Deliberadamente sem `await` de quem chama e sem mensagem de erro na tela: o
 * pedido já mudou de status, e um WhatsApp que não saiu não é motivo para
 * dizer ao operador que a operação falhou. A function decide o template pelo
 * status que está no banco e recusa o envio repetido sozinha, então chamar
 * duas vezes não gera duas mensagens.
 */
export async function requestStatusNotification(orderId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-order-status', {
    body: { orderId },
  })
  if (error) {
    console.error('[orders-api] falha ao pedir o aviso ao cliente:', error)
  }
}
