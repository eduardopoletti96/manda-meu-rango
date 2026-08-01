// Camada de provedor de WhatsApp.
//
// Enquanto as credenciais da Cloud API da Meta (item D do PROXIMOS_PASSOS) não
// existem, um provedor "fake" registra a mensagem no log do console em vez de
// enviá-la — o que permite construir e testar todo o fluxo de token (Fase 4)
// ponta a ponta. Quando WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID forem
// definidos via `supabase secrets set`, o provedor real da Meta entra sozinho.

export type WhatsAppTemplate =
  | 'verification_code'
  // 6.6 — um template por transição de status (documento base §6.5)
  | 'order_confirmed'
  | 'order_in_production'
  | 'order_ready'
  | 'order_out_for_delivery'
  | 'order_finished'

export type WhatsAppMessage = {
  /** Destino em E.164, ex.: +5551999999999 */
  to: string
  template: WhatsAppTemplate
  /** Variáveis que preenchem o texto/template (pode conter segredo, ex.: código). */
  params: Record<string, string>
}

export type SendResult = {
  status: 'sent' | 'failed'
  providerMessageId: string | null
  error: string | null
  provider: 'meta' | 'fake'
}

const META_API_VERSION = 'v21.0'

// Nome do template aprovado na Meta por chave interna. Enquanto o envio é fake
// isto não é usado; fica configurável por env para quando o real entrar.
function metaTemplateName(template: WhatsAppTemplate): string {
  const overrides: Record<WhatsAppTemplate, string | undefined> = {
    verification_code: Deno.env.get('WHATSAPP_TEMPLATE_VERIFICATION'),
    order_confirmed: Deno.env.get('WHATSAPP_TEMPLATE_ORDER_CONFIRMED'),
    order_in_production: Deno.env.get('WHATSAPP_TEMPLATE_ORDER_IN_PRODUCTION'),
    order_ready: Deno.env.get('WHATSAPP_TEMPLATE_ORDER_READY'),
    order_out_for_delivery: Deno.env.get('WHATSAPP_TEMPLATE_ORDER_OUT_FOR_DELIVERY'),
    order_finished: Deno.env.get('WHATSAPP_TEMPLATE_ORDER_FINISHED'),
  }
  const defaults: Record<WhatsAppTemplate, string> = {
    verification_code: 'verification_code',
    order_confirmed: 'order_confirmed',
    order_in_production: 'order_in_production',
    order_ready: 'order_ready',
    order_out_for_delivery: 'order_out_for_delivery',
    order_finished: 'order_finished',
  }
  return overrides[template] ?? defaults[template]
}

/** Texto legível da mensagem; usado pelo provedor fake e no log de depuração. */
export function renderMessageText(message: WhatsAppMessage): string {
  const { customer, order, restaurant, eta, trackUrl } = message.params

  switch (message.template) {
    case 'verification_code':
      return (
        `Seu código de verificação Manda meu Rango é ${message.params.code}. ` +
        'Ele expira em 5 minutos. Não compartilhe com ninguém.'
      )
    case 'order_confirmed':
      return (
        `${customer}, seu pagamento foi confirmado! O pedido #${order} da ${restaurant} ` +
        `já está com a cozinha${eta ? ` e a previsão é ficar pronto às ${eta}` : ''}. ` +
        `Acompanhe por aqui: ${trackUrl}`
      )
    case 'order_in_production':
      return `${customer}, o pedido #${order} da ${restaurant} entrou em preparo agora. 👩‍🍳`
    case 'order_ready':
      return `${customer}, o pedido #${order} está pronto para retirada na ${restaurant}. 🛍️`
    case 'order_out_for_delivery':
      return `${customer}, o pedido #${order} da ${restaurant} saiu para entrega. 🛵`
    case 'order_finished':
      return `${customer}, o pedido #${order} da ${restaurant} foi concluído. Obrigado! 🧡`
  }
}

async function sendViaMeta(
  message: WhatsAppMessage,
  token: string,
  phoneNumberId: string,
): Promise<SendResult> {
  // Mensagens iniciadas pelo negócio (fora da janela de 24h) exigem um template
  // aprovado; por isso enviamos type=template com os parâmetros no corpo.
  const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to: message.to.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: metaTemplateName(message.template),
      language: { code: Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'pt_BR' },
      components: [
        {
          type: 'body',
          parameters: Object.values(message.params).map((text) => ({ type: 'text', text })),
        },
      ],
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      const error =
        data?.error?.message ?? `Meta respondeu ${response.status} ${response.statusText}`
      return { status: 'failed', providerMessageId: null, error, provider: 'meta' }
    }
    const providerMessageId = data?.messages?.[0]?.id ?? null
    return { status: 'sent', providerMessageId, error: null, provider: 'meta' }
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : 'Falha de rede ao chamar a Meta'
    return { status: 'failed', providerMessageId: null, error, provider: 'meta' }
  }
}

function sendViaFake(message: WhatsAppMessage): SendResult {
  const text = renderMessageText(message)
  // Sem envio real: o desenvolvedor lê o código aqui (ou em notification_logs).
  console.log(`[whatsapp:fake] para=${message.to} template=${message.template} texto="${text}"`)
  return {
    status: 'sent',
    providerMessageId: `fake-${crypto.randomUUID()}`,
    error: null,
    provider: 'fake',
  }
}

/** Indica se o provedor real está configurado (usado por dev echo do código). */
export function isRealProviderConfigured(): boolean {
  return Boolean(Deno.env.get('WHATSAPP_API_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'))
}

export function sendWhatsAppMessage(message: WhatsAppMessage): Promise<SendResult> | SendResult {
  const token = Deno.env.get('WHATSAPP_API_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if (token && phoneNumberId) {
    return sendViaMeta(message, token, phoneNumberId)
  }
  return sendViaFake(message)
}
