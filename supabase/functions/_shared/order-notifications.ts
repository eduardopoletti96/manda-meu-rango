import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendWhatsAppMessage, type WhatsAppTemplate } from './whatsapp.ts'

// 6.6 — A mensagem de WhatsApp que cada mudança de status dispara.
//
// A matriz é a do documento base §6.5. Os status que não avisam ninguém ficam
// de fora do mapa: `pending_payment` é o pedido antes de pagar (o cliente está
// olhando a tela do Stripe) e `cancelled` merece um aviso escrito com mais
// cuidado, com o motivo — fica para quando o painel oferecer cancelar com
// justificativa.

const TEMPLATE_BY_STATUS: Record<string, WhatsAppTemplate> = {
  placed: 'order_confirmed',
  in_production: 'order_in_production',
  ready: 'order_ready',
  out_for_delivery: 'order_out_for_delivery',
  finished: 'order_finished',
}

export type NotifyOutcome =
  | { outcome: 'sent'; template: WhatsAppTemplate }
  | { outcome: 'skipped'; reason: string }
  | { outcome: 'failed'; template: WhatsAppTemplate; error: string }

type OrderRow = {
  id: string
  order_number: number
  status: string
  estimated_ready_at: string | null
  customers: { name: string; phone: string } | null
  restaurants: { name: string; slug: string } | null
}

function baseUrl(): string {
  return Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173'
}

function formatEta(iso: string | null): string {
  if (!iso) {
    return ''
  }
  // Horário de Brasília: é o relógio do cliente no MVP (ver PROXIMOS_PASSOS,
  // fuso por restaurante ficou para depois).
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * Avisa o cliente sobre o status atual do pedido, uma única vez.
 *
 * O status vem do banco, nunca de quem chamou: assim o aviso não pode ser
 * disparado para um estado em que o pedido não está.
 *
 * A idempotência é a linha de notification_logs, reservada *antes* do envio —
 * o índice único (order_id, channel, template) parcial em status = 'sent'
 * recusa a segunda reserva, então duas chamadas simultâneas não viram duas
 * mensagens. Se o envio falhar, a linha vira 'failed', sai do índice e libera
 * a vaga para uma nova tentativa.
 */
export async function notifyOrderStatus(
  admin: SupabaseClient,
  orderId: string,
): Promise<NotifyOutcome> {
  const { data, error } = await admin
    .from('orders')
    .select(
      'id, order_number, status, estimated_ready_at, customers(name, phone), restaurants(name, slug)',
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    return { outcome: 'skipped', reason: `falha ao ler pedido: ${error.message}` }
  }
  const order = data as OrderRow | null
  if (!order) {
    return { outcome: 'skipped', reason: 'pedido não encontrado' }
  }

  const template = TEMPLATE_BY_STATUS[order.status]
  if (!template) {
    return { outcome: 'skipped', reason: `status ${order.status} não notifica` }
  }
  if (!order.customers?.phone) {
    return { outcome: 'skipped', reason: 'pedido sem telefone de cliente' }
  }

  const destination = order.customers.phone
  const params = {
    customer: order.customers.name.split(' ')[0],
    order: String(order.order_number),
    restaurant: order.restaurants?.name ?? 'sua loja',
    eta: formatEta(order.estimated_ready_at),
    trackUrl: `${baseUrl()}/${order.restaurants?.slug ?? ''}/pedido/${order.id}`,
  }

  const { data: reserved, error: reserveError } = await admin
    .from('notification_logs')
    .insert({
      order_id: order.id,
      channel: 'whatsapp',
      template,
      destination,
      payload: { status: order.status },
      status: 'sent',
    })
    .select('id')
    .single()

  if (reserveError) {
    if (reserveError.code === '23505') {
      return { outcome: 'skipped', reason: 'mensagem já enviada para este status' }
    }
    return { outcome: 'skipped', reason: `falha ao reservar log: ${reserveError.message}` }
  }

  const message = { to: destination, template, params }
  let result = await sendWhatsAppMessage(message)
  if (result.status === 'failed') {
    result = await sendWhatsAppMessage(message)
  }

  await admin
    .from('notification_logs')
    .update({
      status: result.status,
      provider_message_id: result.providerMessageId,
      error: result.error,
    })
    .eq('id', reserved.id)

  return result.status === 'sent'
    ? { outcome: 'sent', template }
    : { outcome: 'failed', template, error: result.error ?? 'falha no envio' }
}
