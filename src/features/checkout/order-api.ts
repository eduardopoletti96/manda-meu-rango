import { customerSupabase, supabase } from '@/lib/supabase'

// 5.4 — Chamada ao create-order.
//
// Mandamos apenas *o que* e *quanto*: preço, taxa e total são recalculados no
// servidor a partir do cardápio. O JWT do cliente vai no header x-customer-token
// e é verificado pela própria function — o Authorization segue com a anon key,
// que é o que o gateway das Edge Functions checa.

export type CreateOrderInput = {
  token: string
  restaurantId: string
  fulfillmentType: 'pickup' | 'delivery'
  addressId: string | null
  notes: string
  items: { itemId: string; quantity: number }[]
}

export type CreatedOrder = {
  orderId: string
  orderNumber: number
  subtotal: number
  deliveryFee: number
  total: number
  estimatedReadyAt: string | null
}

export type CreateOrderResult = { ok: true; order: CreatedOrder } | { ok: false; error: string }

// Em erro HTTP, o corpo { error } da function fica em error.context (um
// Response); é de lá que sai a mensagem amigável.
async function readFunctionError(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response } | null)?.context
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string }
      if (body?.error) {
        return body.error
      }
    } catch {
      // corpo não-JSON: cai no fallback
    }
  }
  return fallback
}

export type PaymentSessionResult = { ok: true; url: string } | { ok: false; error: string }

/** 5.5 — Abre (ou reabre) a sessão de pagamento do pedido no Stripe. */
export async function createPaymentSession(
  token: string,
  orderId: string,
): Promise<PaymentSessionResult> {
  const { data, error } = await supabase.functions.invoke('create-payment-session', {
    headers: { 'x-customer-token': token },
    body: { orderId },
  })

  if (error) {
    return {
      ok: false,
      error: await readFunctionError(error, 'Não foi possível abrir o pagamento. Tente novamente.'),
    }
  }
  return { ok: true, url: (data as { url: string }).url }
}

export type OrderSummary = {
  id: string
  order_number: number
  status: string
  payment_status: string
  total: number
  estimated_ready_at: string | null
}

/**
 * Estado do pedido para a tela de retorno do pagamento. Vai pelo PostgREST com
 * o JWT do cliente — a RLS só devolve pedidos dele.
 */
export async function fetchOrderSummary(
  token: string,
  orderId: string,
): Promise<OrderSummary | null> {
  const { data, error } = await customerSupabase(token)
    .from('orders')
    .select('id, order_number, status, payment_status, total, estimated_ready_at')
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[order-api] erro ao ler pedido:', error)
    return null
  }
  return data as OrderSummary | null
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { data, error } = await supabase.functions.invoke('create-order', {
    headers: { 'x-customer-token': input.token },
    body: {
      restaurantId: input.restaurantId,
      fulfillmentType: input.fulfillmentType,
      addressId: input.addressId,
      notes: input.notes,
      items: input.items,
    },
  })

  if (error) {
    return {
      ok: false,
      error: await readFunctionError(error, 'Não foi possível criar o pedido. Tente novamente.'),
    }
  }
  return { ok: true, order: data as CreatedOrder }
}
