// 5.5 — Sessão de pagamento no Stripe.
//
// Recebe um pedido já criado (pending_payment) e devolve a URL do Checkout
// hospedado do Stripe. Os valores vêm do pedido gravado, não do navegador: o
// create-order já os calculou a partir do cardápio, e aqui só convertemos para
// centavos.
//
// Separado do create-order de propósito: se o cliente desistir e voltar, dá
// para gerar uma nova sessão para o mesmo pedido sem duplicá-lo.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { verifyCustomerJwt } from '../_shared/jwt.ts'
import { createStripeClient, toCents } from '../_shared/stripe.ts'

// Para onde o Stripe manda o cliente de volta. Em desenvolvimento o próprio
// origin da requisição serve; em produção, APP_BASE_URL. A allowlist evita que
// um origin forjado vire destino de redirecionamento.
function resolveBaseUrl(req: Request): string {
  const configured = Deno.env.get('APP_BASE_URL')
  const allowed = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])
  if (configured) {
    allowed.add(configured)
  }
  const origin = req.headers.get('origin') ?? ''
  if (allowed.has(origin)) {
    return origin
  }
  return configured ?? 'http://localhost:5173'
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
    console.error('[create-payment-session] CUSTOMER_JWT_SECRET ausente.')
    return errorResponse('Serviço mal configurado.', 500)
  }

  const customerToken = req.headers.get('x-customer-token') ?? ''
  const customer = customerToken ? await verifyCustomerJwt(customerToken, jwtSecret) : null
  if (!customer) {
    return errorResponse('Sessão expirada. Confirme seu telefone novamente.', 401)
  }

  let body: { orderId?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Corpo inválido: esperado JSON.')
  }
  if (!body.orderId) {
    return errorResponse('Pedido não informado.')
  }

  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select(
      'id, customer_id, order_number, status, payment_status, delivery_fee, total, restaurants(name, slug), order_items(item_name, unit_price, quantity)',
    )
    .eq('id', body.orderId)
    .maybeSingle()

  if (orderError) {
    console.error('[create-payment-session] erro ao ler pedido:', orderError.message)
    return errorResponse('Não foi possível iniciar o pagamento. Tente novamente.', 500)
  }
  // Pedido de outro cliente responde igual a pedido inexistente: não confirmamos
  // para um estranho que o id existe.
  if (!order || order.customer_id !== customer.customerId) {
    return errorResponse('Pedido não encontrado.', 404)
  }
  if (order.payment_status === 'paid') {
    return errorResponse('Este pedido já está pago.', 409)
  }
  if (order.status !== 'pending_payment') {
    return errorResponse('Este pedido não está mais aguardando pagamento.', 409)
  }

  const restaurant = order.restaurants as { name: string; slug: string } | null
  if (!restaurant) {
    console.error('[create-payment-session] pedido sem restaurante:', order.id)
    return errorResponse('Não foi possível iniciar o pagamento. Tente novamente.', 500)
  }

  const items = (order.order_items ?? []) as {
    item_name: string
    unit_price: number
    quantity: number
  }[]

  const lineItems = items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'brl',
      unit_amount: toCents(item.unit_price),
      product_data: { name: item.item_name },
    },
  }))

  // A taxa vira uma linha própria para o cliente ver o que está pagando.
  const deliveryFee = Number(order.delivery_fee)
  if (deliveryFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'brl',
        unit_amount: toCents(deliveryFee),
        product_data: { name: 'Taxa de entrega' },
      },
    })
  }

  const baseUrl = resolveBaseUrl(req)
  const returnUrl = `${baseUrl}/${restaurant.slug}/checkout?pedido=${order.id}`

  let session
  try {
    const stripe = createStripeClient()
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: order.id,
      // O webhook lê daqui: é o vínculo entre a cobrança e o pedido.
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      success_url: `${returnUrl}&pagamento=sucesso`,
      cancel_url: `${returnUrl}&pagamento=cancelado`,
    })
  } catch (error) {
    console.error('[create-payment-session] erro do Stripe:', (error as Error).message)
    return errorResponse('Não foi possível iniciar o pagamento. Tente novamente.', 502)
  }

  if (!session.url) {
    console.error('[create-payment-session] sessão sem URL:', session.id)
    return errorResponse('Não foi possível iniciar o pagamento. Tente novamente.', 502)
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id)

  if (updateError) {
    // A sessão existe e o webhook ainda acha o pedido pelo metadata; seguir é
    // melhor que abandonar uma cobrança já criada.
    console.error('[create-payment-session] erro ao gravar session id:', updateError.message)
  }

  return jsonResponse({ url: session.url, sessionId: session.id })
})
