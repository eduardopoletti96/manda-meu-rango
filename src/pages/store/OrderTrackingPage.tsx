import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { Loader2, ShoppingBag, Truck } from 'lucide-react'
import { customerSupabase } from '@/lib/supabase'
import { formatBRL, formatTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { useStore } from '@/features/store/store-context'
import { useCustomerSession } from '@/stores/customer-session-store'
import { createPaymentSession } from '@/features/checkout/order-api'
import { fetchTrackedOrder, type TrackedOrder } from '@/features/orders/customer-order-api'
import { OrderTimeline } from '@/features/orders/OrderTimeline'
import { formatSnapshot } from '@/features/orders/types'

// Rede de segurança do tempo real: se a assinatura cair (aba dormindo, rede
// oscilando), o pedido continua se atualizando sozinho.
const POLL_MS = 15_000

function Loading() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Loader2 aria-hidden className="text-muted-foreground size-8 animate-spin" />
      <p className="text-muted-foreground text-sm">Carregando seu pedido…</p>
    </div>
  )
}

// 6.7 — Acompanhamento do pedido pelo cliente.
export function OrderTrackingPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const { restaurant } = useStore()
  const session = useCustomerSession()
  const token = session?.token
  const [order, setOrder] = useState<TrackedOrder | 'not-found' | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (!token || !orderId) {
      return
    }
    let cancelled = false
    let channel: RealtimeChannel | undefined

    const load = () =>
      fetchTrackedOrder(token, orderId).then((result) => {
        if (!cancelled) {
          setOrder(result ?? 'not-found')
        }
      })

    void load()

    // O socket do Realtime autentica em separado do header HTTP: sem o setAuth
    // ele entraria com a anon key e a RLS não devolveria nada.
    const client = customerSupabase(token)
    void Promise.resolve(client.realtime.setAuth(token)).then(() => {
      if (cancelled) {
        return
      }
      channel = client
        .channel(`pedido-${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
          () => void load(),
        )
        .subscribe()
    })

    const poll = window.setInterval(() => void load(), POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(poll)
      if (channel) {
        void client.removeChannel(channel)
      }
    }
  }, [token, orderId])

  const handlePay = useCallback(async () => {
    if (!token || !orderId) {
      return
    }
    setPayError(null)
    setPaying(true)
    const result = await createPaymentSession(token, orderId)
    if (!result.ok) {
      setPaying(false)
      setPayError(result.error)
      return
    }
    window.location.href = result.url
  }, [token, orderId])

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-bold">Identifique-se para ver o pedido</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          O acompanhamento é ligado ao seu telefone. Confirme seu número para abrir este pedido.
        </p>
        <Button asChild className="rounded-2xl">
          <Link to={`/${slug}/identificacao`}>Identificar-me</Link>
        </Button>
      </div>
    )
  }

  if (order === null) {
    return <Loading />
  }

  if (order === 'not-found') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-bold">Pedido não encontrado</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Ele pode pertencer a outro número de telefone. Identifique-se de novo para consultar.
        </p>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link to={`/${slug}`}>Voltar ao cardápio</Link>
        </Button>
      </div>
    )
  }

  const isDelivery = order.fulfillment_type === 'delivery'
  const awaitingPayment = order.status === 'pending_payment'
  const destination =
    order.fulfillment_type === 'delivery'
      ? formatSnapshot(order.address_snapshot)
      : [restaurant.street, restaurant.number, restaurant.district].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-muted-foreground text-sm">{restaurant.name}</p>
        <h1 className="font-display text-2xl font-bold">Pedido #{order.order_number}</h1>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          {isDelivery ? (
            <Truck aria-hidden className="size-4" />
          ) : (
            <ShoppingBag aria-hidden className="size-4" />
          )}
          {isDelivery ? 'Entrega' : 'Retirada'}
          {order.estimated_ready_at && !awaitingPayment
            ? ` · previsão ${formatTime(order.estimated_ready_at)}`
            : ''}
        </p>
      </header>

      {awaitingPayment ? (
        <div className="bg-warning/15 flex flex-col gap-3 rounded-2xl px-4 py-3">
          <div>
            <p className="font-medium">Aguardando pagamento</p>
            <p className="text-muted-foreground text-sm">
              O restaurante só começa a preparar depois que o pagamento é confirmado. Seu pedido
              está guardado — é só concluir.
            </p>
          </div>
          {payError ? (
            <p role="alert" className="text-destructive text-sm">
              {payError}
            </p>
          ) : null}
          <Button className="rounded-2xl" disabled={paying} onClick={() => void handlePay()}>
            {paying ? 'Abrindo pagamento…' : 'Pagar agora'}
          </Button>
        </div>
      ) : (
        <OrderTimeline
          status={order.status}
          fulfillment={order.fulfillment_type}
          history={order.history}
        />
      )}

      <section className="rounded-2xl border p-4">
        <h2 className="mb-2 font-semibold">
          {order.fulfillment_type === 'delivery' ? 'Entrega em' : 'Retirada em'}
        </h2>
        <p className="text-muted-foreground text-sm">{destination || 'Endereço não informado'}</p>
        {order.notes ? (
          <p className="text-muted-foreground mt-2 text-sm">
            <span className="font-medium">Observação:</span> {order.notes}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border p-4">
        <h2 className="mb-2 font-semibold">Itens</h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium">{item.quantity}×</span> {item.item_name}
              </span>
              <span className="shrink-0">
                {formatBRL(item.line_total ?? item.unit_price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatBRL(order.subtotal)}</dd>
          </div>
          {order.delivery_fee > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Taxa de entrega</dt>
              <dd>{formatBRL(order.delivery_fee)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatBRL(order.total)}</dd>
          </div>
        </dl>
      </section>

      <Button asChild variant="outline" className="rounded-2xl">
        <Link to={`/${slug}`}>Voltar ao cardápio</Link>
      </Button>
    </div>
  )
}
