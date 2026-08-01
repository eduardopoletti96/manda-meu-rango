import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatBRL, formatDateTime, formatTime } from '@/lib/format'
import { formatE164Brazil } from '@/features/customer/phone-mask'
import { ORDER_STATUS_LABELS } from './order-status'
import { FulfillmentBadge } from './OrderCard'
import type { AddressSnapshot, KanbanOrder } from './types'

function maskCep(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : (value ?? '')
}

function AddressBlock({ snapshot }: { snapshot: AddressSnapshot | null }) {
  if (!snapshot) {
    return <p className="text-muted-foreground text-sm">Endereço não informado.</p>
  }
  const line1 = [snapshot.street, snapshot.number].filter(Boolean).join(', ')
  const line2 = [snapshot.district, [snapshot.city, snapshot.state].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="text-sm">
      {snapshot.label ? <p className="font-medium">{snapshot.label}</p> : null}
      <p>{line1}</p>
      {snapshot.complement ? <p>{snapshot.complement}</p> : null}
      <p className="text-muted-foreground">{line2}</p>
      {snapshot.zip_code ? (
        <p className="text-muted-foreground">CEP {maskCep(snapshot.zip_code)}</p>
      ) : null}
      {snapshot.reference ? (
        <p className="text-muted-foreground">Referência: {snapshot.reference}</p>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium uppercase">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

/**
 * 6.2 — Detalhe do pedido em modal: o card mostra o que serve de longe, aqui
 * fica o que o operador precisa quando para para atender (telefone, endereço
 * completo, observação, preço por item).
 */
export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  actions,
}: {
  order: KanbanOrder
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Pedido #{order.order_number}
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <FulfillmentBadge order={order} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cliente">
            <p>{order.customer?.name ?? 'Cliente'}</p>
            {order.customer ? (
              <a
                href={`tel:${order.customer.phone}`}
                className="text-primary text-sm hover:underline"
              >
                {formatE164Brazil(order.customer.phone)}
              </a>
            ) : null}
          </Field>
          <Field label="Horários">
            <p>Feito em {formatDateTime(order.created_at)}</p>
            {order.estimated_ready_at ? (
              <p className="text-muted-foreground">
                Previsão: {formatTime(order.estimated_ready_at)}
              </p>
            ) : null}
            {order.finished_at ? (
              <p className="text-muted-foreground">Finalizado às {formatTime(order.finished_at)}</p>
            ) : null}
          </Field>
        </div>

        <Field label={order.fulfillment_type === 'delivery' ? 'Entregar em' : 'Modalidade'}>
          {order.fulfillment_type === 'delivery' ? (
            <AddressBlock snapshot={order.address_snapshot} />
          ) : (
            <p>Retirada no balcão pelo cliente.</p>
          )}
        </Field>

        {order.notes ? (
          <Field label="Observação do cliente">
            <p className="bg-warning/10 rounded-md px-3 py-2">{order.notes}</p>
          </Field>
        ) : null}

        <Field label="Itens">
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="min-w-0">
                  <span className="font-medium">{item.quantity}×</span> {item.item_name}
                  <span className="text-muted-foreground block text-xs">
                    {formatBRL(item.unit_price)} cada
                  </span>
                </span>
                <span className="shrink-0 font-medium">
                  {formatBRL(item.line_total ?? item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </Field>

        <dl className="text-sm">
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

        {actions}
      </DialogContent>
    </Dialog>
  )
}
