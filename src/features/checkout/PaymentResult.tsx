import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
import { createPaymentSession, fetchOrderSummary, type OrderSummary } from './order-api'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30_000

type PaymentResultProps = {
  token: string
  slug: string
  orderId: string
  /** 'sucesso' quando o Stripe devolveu pela success_url. */
  outcome: string
}

// 5.5 — Tela de retorno do pagamento.
//
// Voltar do Stripe não prova pagamento: quem confirma é o webhook (5.6). Por
// isso a tela consulta o pedido e fica reconsultando por até 30 s enquanto o
// payment_status ainda estiver pendente — o webhook costuma chegar antes do
// cliente terminar de ler a primeira linha, mas não dá para contar com isso.
export function PaymentResult({ token, slug, orderId, outcome }: PaymentResultProps) {
  const expectPaid = outcome === 'sucesso'
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const deadline = Date.now() + POLL_TIMEOUT_MS

    function check() {
      void fetchOrderSummary(token, orderId).then((summary) => {
        if (cancelled) {
          return
        }
        setOrder(summary)
        setLoading(false)
        const stillWaiting = expectPaid && summary?.payment_status === 'pending'
        if (stillWaiting && Date.now() < deadline) {
          timer = window.setTimeout(check, POLL_INTERVAL_MS)
        }
      })
    }

    check()
    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [token, orderId, expectPaid])

  async function handleRetry() {
    setError(null)
    setRetrying(true)
    const result = await createPaymentSession(token, orderId)
    if (!result.ok) {
      setRetrying(false)
      setError(result.error)
      return
    }
    window.location.href = result.url
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 aria-hidden className="text-muted-foreground size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Conferindo seu pedido…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <XCircle aria-hidden className="text-destructive size-12" />
        <div>
          <h1 className="text-xl font-bold">Pedido não encontrado</h1>
          <p className="text-muted-foreground text-sm">
            Ele pode pertencer a outro número de telefone. Identifique-se de novo para consultar.
          </p>
        </div>
        <Button asChild className="rounded-2xl">
          <Link to={`/${slug}`}>Voltar ao cardápio</Link>
        </Button>
      </div>
    )
  }

  const paid = order.payment_status === 'paid'
  const waiting = expectPaid && order.payment_status === 'pending'

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      {paid ? (
        <CheckCircle2 aria-hidden className="text-success size-14" />
      ) : waiting ? (
        <Loader2 aria-hidden className="text-muted-foreground size-14 animate-spin" />
      ) : (
        <XCircle aria-hidden className="text-destructive size-14" />
      )}

      <div>
        <h1 className="text-xl font-bold">
          {paid
            ? `Pagamento confirmado — pedido #${order.order_number}`
            : waiting
              ? 'Confirmando seu pagamento…'
              : 'Pagamento não concluído'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {paid
            ? `Total de ${formatBRL(order.total)}${
                order.estimated_ready_at
                  ? ` · previsão de ficar pronto às ${new Date(
                      order.estimated_ready_at,
                    ).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : ''
              }`
            : waiting
              ? 'O Stripe já recebeu; estamos aguardando a confirmação. Isso costuma levar segundos.'
              : `Seu pedido #${order.order_number} está guardado. Você pode tentar pagar de novo.`}
        </p>
      </div>

      {paid ? (
        <p className="text-muted-foreground max-w-sm text-xs">
          O restaurante já foi avisado e seu pedido entrou na fila de produção.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {paid ? (
          <Button asChild className="rounded-2xl">
            <Link to={`/${slug}/pedido/${order.id}`}>Acompanhar pedido</Link>
          </Button>
        ) : !waiting ? (
          <Button className="rounded-2xl" disabled={retrying} onClick={() => void handleRetry()}>
            {retrying ? 'Abrindo pagamento…' : 'Tentar pagar de novo'}
          </Button>
        ) : null}
        <Button asChild variant="outline" className="rounded-2xl">
          <Link to={`/${slug}`}>Voltar ao cardápio</Link>
        </Button>
      </div>
    </div>
  )
}
