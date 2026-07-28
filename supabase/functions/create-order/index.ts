// 5.4 — Criação do pedido no servidor.
//
// Regra crítica do documento base (§2.1): o front nunca define preços nem
// totais. O carrinho manda apenas *o que* e *quanto*; aqui relemos cada item no
// banco, recalculamos subtotal, taxa e total, congelamos o endereço e gravamos
// o pedido como pending_payment — adulterar o preço no navegador não muda um
// centavo do que será cobrado.
//
// A identidade do cliente vem do header x-customer-token e é verificada aqui
// mesmo (decisão da Fase 5): a function roda com service role, fora da RLS,
// então precisa saber por conta própria de quem é o pedido.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { verifyCustomerJwt } from '../_shared/jwt.ts'

const MAX_DISTINCT_ITEMS = 60
const MAX_QUANTITY_PER_ITEM = 99
const MAX_NOTES_LENGTH = 500

type RequestedItem = { itemId: string; quantity: number }

/** Dinheiro em 2 casas: evita que 19.9 * 3 vire 59.699999999999996. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Soma quantidades do mesmo item e valida o formato do que o carrinho mandou. */
function normalizeItems(raw: unknown): RequestedItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_DISTINCT_ITEMS) {
    return null
  }

  const merged = new Map<string, number>()
  for (const entry of raw) {
    const itemId = (entry as { itemId?: unknown })?.itemId
    const quantity = (entry as { quantity?: unknown })?.quantity
    if (typeof itemId !== 'string' || itemId.length === 0) {
      return null
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return null
    }
    const total = (merged.get(itemId) ?? 0) + quantity
    if (total > MAX_QUANTITY_PER_ITEM) {
      return null
    }
    merged.set(itemId, total)
  }

  return [...merged].map(([itemId, quantity]) => ({ itemId, quantity }))
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) {
    return preflight
  }
  if (req.method !== 'POST') {
    return errorResponse('Método não permitido.', 405)
  }

  const jwtSecret = Deno.env.get('CUSTOMER_JWT_SECRET')
  if (!jwtSecret) {
    console.error('[create-order] CUSTOMER_JWT_SECRET ausente.')
    return errorResponse('Serviço mal configurado.', 500)
  }

  const customerToken = req.headers.get('x-customer-token') ?? ''
  const customer = customerToken ? await verifyCustomerJwt(customerToken, jwtSecret) : null
  if (!customer) {
    return errorResponse('Sessão expirada. Confirme seu telefone novamente.', 401)
  }

  let body: {
    restaurantId?: string
    fulfillmentType?: string
    addressId?: string | null
    notes?: string
    items?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Corpo inválido: esperado JSON.')
  }

  const restaurantId = body.restaurantId ?? ''
  if (!restaurantId) {
    return errorResponse('Restaurante não informado.')
  }
  const fulfillmentType = body.fulfillmentType
  if (fulfillmentType !== 'pickup' && fulfillmentType !== 'delivery') {
    return errorResponse('Escolha entre retirada e entrega.')
  }
  const items = normalizeItems(body.items)
  if (!items) {
    return errorResponse('Carrinho inválido.')
  }
  const notes = (body.notes ?? '').trim().slice(0, MAX_NOTES_LENGTH)

  const admin = createAdminClient()

  // --- restaurante -----------------------------------------------------------
  const { data: restaurant, error: restaurantError } = await admin
    .from('restaurants')
    .select(
      'id, is_active, delivery_enabled, pickup_enabled, delivery_fee, min_order_value, avg_prep_time_minutes',
    )
    .eq('id', restaurantId)
    .maybeSingle()

  if (restaurantError) {
    console.error('[create-order] erro ao ler restaurante:', restaurantError.message)
    return errorResponse('Não foi possível criar o pedido agora. Tente novamente.', 500)
  }
  if (!restaurant || !restaurant.is_active) {
    return errorResponse('Restaurante indisponível.', 404)
  }
  if (fulfillmentType === 'delivery' && !restaurant.delivery_enabled) {
    return errorResponse('Este restaurante não está fazendo entregas.')
  }
  if (fulfillmentType === 'pickup' && !restaurant.pickup_enabled) {
    return errorResponse('Este restaurante não está aceitando retirada.')
  }

  // --- itens: preço e disponibilidade vêm do banco, nunca do carrinho --------
  const { data: menuItems, error: menuError } = await admin
    .from('menu_items')
    .select('id, name, price, is_available, restaurant_id, categories!inner(is_active)')
    .in('id', items.map((item) => item.itemId))

  if (menuError) {
    console.error('[create-order] erro ao ler cardápio:', menuError.message)
    return errorResponse('Não foi possível criar o pedido agora. Tente novamente.', 500)
  }

  const byId = new Map(menuItems?.map((item) => [item.id as string, item]) ?? [])
  const orderItems: {
    menu_item_id: string
    item_name: string
    unit_price: number
    quantity: number
  }[] = []

  for (const requested of items) {
    const menuItem = byId.get(requested.itemId)
    if (!menuItem || menuItem.restaurant_id !== restaurantId) {
      return errorResponse('Um dos itens do carrinho não existe mais. Revise seu pedido.')
    }
    const category = menuItem.categories as { is_active: boolean } | null
    if (!menuItem.is_available || !category?.is_active) {
      return errorResponse(`"${menuItem.name}" está indisponível no momento. Revise seu pedido.`)
    }
    orderItems.push({
      menu_item_id: menuItem.id as string,
      item_name: menuItem.name as string,
      unit_price: Number(menuItem.price),
      quantity: requested.quantity,
    })
  }

  const subtotal = round2(
    orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
  )
  if (subtotal < Number(restaurant.min_order_value)) {
    return errorResponse(
      `O pedido mínimo deste restaurante é de R$ ${Number(restaurant.min_order_value)
        .toFixed(2)
        .replace('.', ',')}.`,
    )
  }

  const deliveryFee = fulfillmentType === 'delivery' ? round2(Number(restaurant.delivery_fee)) : 0
  const total = round2(subtotal + deliveryFee)

  // --- endereço: congelado no pedido, sobrevive a edição e exclusão ---------
  let addressId: string | null = null
  let addressSnapshot: Record<string, unknown> | null = null

  if (fulfillmentType === 'delivery') {
    if (!body.addressId) {
      return errorResponse('Escolha um endereço de entrega.')
    }
    const { data: address, error: addressError } = await admin
      .from('customer_addresses')
      .select('id, label, zip_code, street, number, complement, district, city, state, reference')
      .eq('id', body.addressId)
      .eq('customer_id', customer.customerId)
      .maybeSingle()

    if (addressError) {
      console.error('[create-order] erro ao ler endereço:', addressError.message)
      return errorResponse('Não foi possível criar o pedido agora. Tente novamente.', 500)
    }
    if (!address) {
      return errorResponse('Endereço de entrega não encontrado.')
    }

    addressId = address.id as string
    const { id: _ignored, ...snapshot } = address
    addressSnapshot = snapshot
  }

  // --- gravação --------------------------------------------------------------
  const estimatedReadyAt = new Date(
    Date.now() + Number(restaurant.avg_prep_time_minutes) * 60_000,
  ).toISOString()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      customer_id: customer.customerId,
      status: 'pending_payment',
      payment_status: 'pending',
      fulfillment_type: fulfillmentType,
      address_id: addressId,
      address_snapshot: addressSnapshot,
      notes: notes.length > 0 ? notes : null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      estimated_ready_at: estimatedReadyAt,
    })
    .select('id, order_number, subtotal, delivery_fee, total, estimated_ready_at')
    .single()

  if (orderError || !order) {
    console.error('[create-order] erro ao gravar pedido:', orderError?.message)
    return errorResponse('Não foi possível criar o pedido agora. Tente novamente.', 500)
  }

  const { error: itemsError } = await admin
    .from('order_items')
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))

  if (itemsError) {
    // Pedido sem itens não serve para nada e ainda ocuparia um número na
    // sequência do restaurante: desfazemos para não deixar lixo no kanban.
    console.error('[create-order] erro ao gravar itens:', itemsError.message)
    await admin.from('orders').delete().eq('id', order.id)
    return errorResponse('Não foi possível criar o pedido agora. Tente novamente.', 500)
  }

  return jsonResponse({
    orderId: order.id,
    orderNumber: order.order_number,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    estimatedReadyAt: order.estimated_ready_at,
  })
})
