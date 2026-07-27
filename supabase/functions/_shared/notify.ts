import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  sendWhatsAppMessage,
  type SendResult,
  type WhatsAppTemplate,
} from './whatsapp.ts'

export type NotifyInput = {
  /** Destino em E.164. */
  to: string
  template: WhatsAppTemplate
  /** Variáveis que montam a mensagem (podem conter segredo, ex.: o código). */
  renderParams: Record<string, string>
  /**
   * O que gravar em notification_logs.payload. Nunca inclua segredos aqui —
   * o código de verificação, por exemplo, jamais é persistido em claro.
   * Se omitido, o payload fica nulo.
   */
  logPayload?: Record<string, unknown> | null
  /** Pedido relacionado, quando a notificação nasce de um (Fases 5/6). */
  orderId?: string | null
}

// Envia pelo provedor de WhatsApp e registra o resultado em notification_logs.
// Uma tentativa de retry cobre falhas transitórias de rede/provedor.
export async function sendAndLogWhatsApp(
  admin: SupabaseClient,
  input: NotifyInput,
): Promise<SendResult> {
  const message = { to: input.to, template: input.template, params: input.renderParams }

  let result = await sendWhatsAppMessage(message)
  if (result.status === 'failed') {
    result = await sendWhatsAppMessage(message)
  }

  const { error: logError } = await admin.from('notification_logs').insert({
    order_id: input.orderId ?? null,
    channel: 'whatsapp',
    template: input.template,
    destination: input.to,
    payload: input.logPayload ?? null,
    status: result.status,
    provider_message_id: result.providerMessageId,
    error: result.error,
  })
  // O log é auditoria: uma falha ao gravá-lo não deve derrubar o envio já feito.
  if (logError) {
    console.error('[notify] falha ao gravar notification_logs:', logError.message)
  }

  return result
}
