import { Check, ChefHat, CircleCheck, Package, Receipt, Truck } from 'lucide-react'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FulfillmentType, OrderStatus } from './order-status'
import type { StatusStep } from './customer-order-api'

type Step = {
  status: OrderStatus
  label: string
  hint: string
  icon: typeof Check
}

const CONFIRMED: Step = {
  status: 'placed',
  label: 'Pedido confirmado',
  hint: 'Pagamento aprovado e pedido enviado ao restaurante.',
  icon: Receipt,
}

const IN_PRODUCTION: Step = {
  status: 'in_production',
  label: 'Em preparo',
  hint: 'A cozinha começou a preparar seu pedido.',
  icon: ChefHat,
}

const FINISHED: Step = {
  status: 'finished',
  label: 'Concluído',
  hint: 'Bom apetite!',
  icon: CircleCheck,
}

/** O caminho depende da modalidade: retirada passa por "pronto", entrega não. */
function stepsFor(fulfillment: FulfillmentType): Step[] {
  const middle: Step =
    fulfillment === 'delivery'
      ? {
          status: 'out_for_delivery',
          label: 'Saiu para entrega',
          hint: 'Seu pedido está a caminho.',
          icon: Truck,
        }
      : {
          status: 'ready',
          label: 'Pronto para retirada',
          hint: 'Pode vir buscar — está esperando por você.',
          icon: Package,
        }
  return [CONFIRMED, IN_PRODUCTION, middle, FINISHED]
}

/**
 * 6.7 — Linha do tempo do pedido.
 *
 * O que já aconteceu vem do histórico de status, não de uma suposição pela
 * ordem: assim cada etapa mostra a hora real em que passou, e um pedido que
 * pulou etapa (cancelado no meio) não aparece com passos inventados.
 */
export function OrderTimeline({
  status,
  fulfillment,
  history,
}: {
  status: OrderStatus
  fulfillment: FulfillmentType
  history: StatusStep[]
}) {
  const reachedAt = new Map(history.map((step) => [step.to_status, step.changed_at]))
  const steps = stepsFor(fulfillment)

  if (status === 'cancelled') {
    const cancelledAt = reachedAt.get('cancelled')
    return (
      <div className="bg-destructive/10 text-destructive rounded-2xl px-4 py-3 text-sm">
        <strong>Pedido cancelado</strong>
        {cancelledAt ? ` às ${formatTime(cancelledAt)}` : ''}. Fale com o restaurante se tiver
        dúvida sobre o valor pago.
      </div>
    )
  }

  const currentIndex = steps.findIndex((step) => step.status === status)

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const at = reachedAt.get(step.status)
        const done = at !== undefined || (currentIndex >= 0 && index < currentIndex)
        const current = index === currentIndex
        const Icon = step.icon

        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  done
                    ? 'border-success bg-success text-white'
                    : current
                      ? 'border-primary text-primary animate-pulse'
                      : 'border-border text-muted-foreground',
                )}
              >
                {done && !current ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <Icon aria-hidden className="size-4" />
                )}
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn('w-0.5 flex-1', done ? 'bg-success' : 'bg-border')}
                  style={{ minHeight: '1.5rem' }}
                />
              ) : null}
            </div>

            <div className={cn('pb-6', index === steps.length - 1 && 'pb-0')}>
              <p
                className={cn(
                  'font-medium',
                  !done && !current && 'text-muted-foreground font-normal',
                )}
              >
                {step.label}
                {at ? (
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    {formatTime(at)}
                  </span>
                ) : null}
              </p>
              {done || current ? (
                <p className="text-muted-foreground text-sm">{step.hint}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
