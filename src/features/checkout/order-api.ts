import { supabase } from '@/lib/supabase'

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
