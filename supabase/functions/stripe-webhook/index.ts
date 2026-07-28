// 5.6 — Webhook do Stripe: é ele, e só ele, que declara um pedido pago.
//
// Regra crítica do documento base (§6.2): o front nunca marca o pedido como
// pago; voltar da tela do Stripe não prova nada. O pedido só sai de
// pending_payment quando o Stripe nos conta, aqui, com assinatura válida.
//
// Deploy obrigatoriamente com --no-verify-jwt: quem chama é o Stripe, que não
// tem (nem deveria ter) um JWT do Supabase. A autenticação desta função é a
// assinatura do webhook.

import { createAdminClient } from '../_shared/supabase-admin.ts'
import { createStripeClient, cryptoProvider, Stripe } from '../_shared/stripe.ts'

// Sem CORS: não é o navegador que chama.
function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

type Admin = ReturnType<typeof createAdminClient>

/** Pedido referenciado pelo evento: metadata é a fonte, sessão é o reforço. */
function orderIdFrom(object: Stripe.Checkout.Session | Stripe.PaymentIntent): string | null {
  const fromMetadata = object.metadata?.order_id
  if (fromMetadata) {
    return fromMetadata
  }
  const reference = (object as Stripe.Checkout.Session).client_reference_id
  return reference ?? null
}

async function markPaid(
  admin: Admin,
  orderId: string,
  paymentIntentId: string | null,
): Promise<void> {
  // O filtro por status é a trava: se o pedido já foi pago (evento repetido) ou
  // cancelado enquanto isso, nada acontece — e a trigger de transição de status
  // nem chega a ser provocada com um caminho inválido.
  const { data, error } = await admin
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'placed',
      paid_at: new Date().toISOString(),
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select('id, order_number')

  if (error) {
    throw new Error(`falha ao confirmar pagamento do pedido ${orderId}: ${error.message}`)
  }
  if (!data || data.length === 0) {
    console.log(`[stripe-webhook] pedido ${orderId} nao estava aguardando pagamento; ignorado`)
    return
  }
  console.log(`[stripe-webhook] pedido #${data[0].order_number} confirmado como pago`)
}

async function markFailed(admin: Admin, orderId: string): Promise<void> {
  // O pedido continua em pending_payment: o cliente pode tentar pagar de novo
  // sem refazer o carrinho. O que muda é o payment_status.
  const { error } = await admin
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', orderId)
    .eq('payment_status', 'pending')

  if (error) {
    throw new Error(`falha ao marcar pagamento do pedido ${orderId}: ${error.message}`)
  }
  console.log(`[stripe-webhook] pagamento do pedido ${orderId} marcado como failed`)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return respond({ error: 'Método não permitido.' }, 405)
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET ausente.')
    return respond({ error: 'Serviço mal configurado.' }, 500)
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return respond({ error: 'Assinatura ausente.' }, 400)
  }

  // O corpo cru é o que foi assinado: reparsear como JSON invalidaria a conta.
  const payload = await req.text()

  let event: Stripe.Event
  try {
    const stripe = createStripeClient()
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider(),
    )
  } catch (error) {
    console.error('[stripe-webhook] assinatura invalida:', (error as Error).message)
    return respond({ error: 'Assinatura inválida.' }, 400)
  }

  const admin = createAdminClient()

  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent
  const orderId = orderIdFrom(object)

  // Idempotência: a PK de stripe_events recusa o segundo registro do mesmo
  // evento. Gravar *antes* de agir é o que garante que uma reentrega não
  // reprocessa — e responder 200 evita que o Stripe insista à toa.
  const { error: insertError } = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type, order_id: orderId })

  if (insertError) {
    if (insertError.code === '23505') {
      console.log(`[stripe-webhook] evento ${event.id} ja processado; ignorado`)
      return respond({ received: true, duplicate: true })
    }
    console.error('[stripe-webhook] erro ao registrar evento:', insertError.message)
    // Sem registro não há idempotência: melhor falhar e deixar o Stripe reenviar.
    return respond({ error: 'Falha ao registrar evento.' }, 500)
  }

  if (!orderId) {
    console.warn(`[stripe-webhook] evento ${event.type} sem order_id; ignorado`)
    return respond({ received: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = object as Stripe.Checkout.Session
        // Boleto e afins voltam 'unpaid' aqui e só confirmam no evento async.
        if (session.payment_status === 'paid') {
          const paymentIntent = session.payment_intent
          await markPaid(
            admin,
            orderId,
            typeof paymentIntent === 'string' ? paymentIntent : (paymentIntent?.id ?? null),
          )
        } else {
          console.log(`[stripe-webhook] sessao de ${orderId} ainda nao paga; aguardando`)
        }
        break
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
      case 'payment_intent.payment_failed':
        await markFailed(admin, orderId)
        break
      default:
        console.log(`[stripe-webhook] evento ${event.type} sem tratamento; ignorado`)
    }
  } catch (error) {
    console.error('[stripe-webhook]', (error as Error).message)
    // Solta o registro do evento antes de pedir reentrega: se ele ficasse, a
    // próxima tentativa do Stripe bateria no atalho de duplicata e o pedido
    // nunca sairia de pending_payment por causa de uma falha passageira.
    await admin.from('stripe_events').delete().eq('id', event.id)
    return respond({ error: 'Falha ao processar evento.' }, 500)
  }

  return respond({ received: true })
})
