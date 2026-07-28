import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bike, ShoppingBag, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/features/store/store-context'
import { AddressPicker } from '@/features/checkout/AddressPicker'
import { PaymentResult } from '@/features/checkout/PaymentResult'
import { createOrder, createPaymentSession } from '@/features/checkout/order-api'
import { formatBRL } from '@/lib/format'
import { cartSubtotal, useCart, useCartStore } from '@/stores/cart-store'
import { useCustomerSession } from '@/stores/customer-session-store'

type Fulfillment = 'pickup' | 'delivery'

function FulfillmentOption({
  selected,
  onSelect,
  icon,
  title,
  detail,
}: {
  selected: boolean
  onSelect: () => void
  icon: ReactNode
  title: string
  detail: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`bg-card flex flex-1 flex-col items-start gap-1 rounded-2xl border p-4 text-left shadow-sm transition-colors ${
        selected ? 'border-primary ring-primary/30 ring-2' : 'hover:border-primary/50'
      }`}
    >
      <span className={selected ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-muted-foreground text-sm">{detail}</span>
    </button>
  )
}

// 5.1 — Checkout: modalidade, endereço e resumo.
//
// O total mostrado aqui é sempre uma previsão: quem manda é o create-order,
// que relê os preços no banco. Ao confirmar, o pedido é criado e o cliente vai
// para o Checkout do Stripe (5.5); a volta cai no PaymentResult, via
// ?pedido=<id>&pagamento=<sucesso|cancelado>.
export function CheckoutPage() {
  const { restaurant, openState } = useStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cart = useCart(restaurant.id)
  const clearCart = useCartStore((state) => state.clear)
  const session = useCustomerSession()

  // Modalidade inicial: entrega quando disponível — o caminho mais comum —,
  // senão retirada. O restaurante sempre tem ao menos uma das duas (constraint
  // restaurants_fulfillment_present).
  const [fulfillment, setFulfillment] = useState<Fulfillment>(
    restaurant.delivery_enabled ? 'delivery' : 'pickup',
  )
  const [addressId, setAddressId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const returningOrderId = searchParams.get('pedido')
  const subtotal = cartSubtotal(cart)
  const deliveryFee = fulfillment === 'delivery' ? restaurant.delivery_fee : 0
  const total = subtotal + deliveryFee
  const belowMinimum = subtotal < restaurant.min_order_value

  // Sem sessão não há a quem atribuir o pedido: volta para a identificação e
  // retorna aqui depois (o carrinho é persistido, nada se perde).
  if (!session) {
    const next = encodeURIComponent(`/${restaurant.slug}/checkout`)
    return <Navigate to={`/${restaurant.slug}/identificacao?next=${next}`} replace />
  }

  // Volta do Stripe: a URL carrega o pedido, e é o webhook (não esta tela) que
  // diz se ele foi pago.
  if (returningOrderId) {
    return (
      <PaymentResult
        token={session.token}
        slug={restaurant.slug}
        orderId={returningOrderId}
        outcome={searchParams.get('pagamento') ?? ''}
      />
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShoppingBag aria-hidden className="text-muted-foreground size-12" />
        <div>
          <h1 className="text-xl font-bold">Nada para finalizar</h1>
          <p className="text-muted-foreground text-sm">
            Seu carrinho está vazio — escolha alguma coisa gostosa primeiro.
          </p>
        </div>
        <Button asChild className="rounded-2xl">
          <Link to={`/${restaurant.slug}`}>Ver cardápio</Link>
        </Button>
      </div>
    )
  }

  async function handleSubmit() {
    if (!session) {
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await createOrder({
      token: session.token,
      restaurantId: restaurant.id,
      fulfillmentType: fulfillment,
      addressId: fulfillment === 'delivery' ? addressId : null,
      notes: cart.notes,
      items: cart.items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    })
    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      return
    }

    // O pedido congelou nome, preço e quantidade de cada item: o carrinho já
    // cumpriu seu papel. Se o pagamento falhar, dá para retomar pelo pedido.
    clearCart(restaurant.id)

    const payment = await createPaymentSession(session.token, result.order.orderId)
    if (!payment.ok) {
      setSubmitting(false)
      setError(payment.error)
      void navigate(`/${restaurant.slug}/checkout?pedido=${result.order.orderId}`, {
        replace: true,
      })
      return
    }
    // Sai da aplicação para o Checkout hospedado do Stripe; a volta é pela
    // success_url ou cancel_url configuradas na sessão.
    window.location.href = payment.url
  }

  const bothModes = restaurant.delivery_enabled && restaurant.pickup_enabled
  const missingAddress = fulfillment === 'delivery' && !addressId

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar ao carrinho">
          <Link to={`/${restaurant.slug}/carrinho`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Finalizar pedido</h1>
      </div>

      {openState === 'closed' ? (
        <p className="bg-warning/15 rounded-md px-3 py-2 text-sm">
          O restaurante está fechado agora — seu pedido pode demorar mais para ser aceito.
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">Como você quer receber?</h2>
        {bothModes ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <FulfillmentOption
              selected={fulfillment === 'delivery'}
              onSelect={() => setFulfillment('delivery')}
              icon={<Bike className="size-5" />}
              title="Entrega"
              detail={
                restaurant.delivery_fee > 0
                  ? `Taxa de ${formatBRL(restaurant.delivery_fee)}`
                  : 'Entrega grátis'
              }
            />
            <FulfillmentOption
              selected={fulfillment === 'pickup'}
              onSelect={() => setFulfillment('pickup')}
              icon={<Store className="size-5" />}
              title="Retirada"
              detail="Sem taxa, você busca no balcão"
            />
          </div>
        ) : (
          <p className="bg-card text-muted-foreground rounded-2xl border p-4 text-sm shadow-sm">
            {restaurant.delivery_enabled
              ? 'Este restaurante trabalha apenas com entrega.'
              : 'Este restaurante trabalha apenas com retirada — você busca o pedido no balcão.'}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-bold">
          {fulfillment === 'delivery' ? 'Endereço de entrega' : 'Onde retirar'}
        </h2>
        {fulfillment === 'delivery' ? (
          <AddressPicker
            token={session.token}
            customerId={session.customer.id}
            selectedId={addressId}
            onSelectedChange={setAddressId}
          />
        ) : (
          <div className="bg-card rounded-2xl border p-4 shadow-sm">
            <p className="font-semibold">{restaurant.name}</p>
            <p className="text-muted-foreground text-sm">
              {[
                [restaurant.street, restaurant.number].filter(Boolean).join(', '),
                restaurant.district,
                [restaurant.city, restaurant.state].filter(Boolean).join('/'),
              ]
                .filter(Boolean)
                .join(' — ') || 'Endereço não informado pelo restaurante.'}
            </p>
          </div>
        )}
      </section>

      <section className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
        <h2 className="font-display font-bold">Resumo</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {cart.items.map((item) => (
            <li key={item.itemId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {item.quantity}x {item.name}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatBRL(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {cart.notes.trim().length > 0 ? (
          <p className="text-muted-foreground border-t pt-2 text-sm">
            <span className="font-medium">Observação:</span> {cart.notes}
          </p>
        ) : null}

        <div className="flex flex-col gap-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          {fulfillment === 'delivery' ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de entrega</span>
              <span>{deliveryFee > 0 ? formatBRL(deliveryFee) : 'Grátis'}</span>
            </div>
          ) : null}
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span aria-live="polite" className="font-display text-xl">
              {formatBRL(total)}
            </span>
          </div>
        </div>

        {belowMinimum ? (
          <p className="bg-warning/15 rounded-md px-3 py-2 text-xs">
            O pedido mínimo deste restaurante é {formatBRL(restaurant.min_order_value)}. Faltam{' '}
            {formatBRL(restaurant.min_order_value - subtotal)}.
          </p>
        ) : null}

        {missingAddress ? (
          <p className="text-muted-foreground text-xs">
            Escolha ou cadastre um endereço para continuar.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        <Button
          className="rounded-2xl"
          disabled={submitting || belowMinimum || missingAddress}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Criando pedido…' : 'Ir para o pagamento'}
        </Button>
        <Button
          variant="ghost"
          className="rounded-2xl"
          onClick={() => void navigate(`/${restaurant.slug}/carrinho`)}
        >
          Revisar carrinho
        </Button>
      </section>
    </div>
  )
}
