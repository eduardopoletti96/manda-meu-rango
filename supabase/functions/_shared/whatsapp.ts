// Camada de provedor de WhatsApp.
//
// Enquanto as credenciais da Cloud API da Meta (item D do PROXIMOS_PASSOS) não
// existem, um provedor "fake" registra a mensagem no log do console em vez de
// enviá-la — o que permite construir e testar todo o fluxo de token (Fase 4)
// ponta a ponta. Quando WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID forem
// definidos via `supabase secrets set`, o provedor real da Meta entra sozinho.

export type WhatsAppTemplate = 'verification_code'

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
  }
  const defaults: Record<WhatsAppTemplate, string> = {
    verification_code: 'verification_code',
  }
  return overrides[template] ?? defaults[template]
}

/** Texto legível da mensagem; usado pelo provedor fake e no log de depuração. */
export function renderMessageText(message: WhatsAppMessage): string {
  switch (message.template) {
    case 'verification_code':
      return (
        `Seu código de verificação Manda meu Rango é ${message.params.code}. ` +
        'Ele expira em 5 minutos. Não compartilhe com ninguém.'
      )
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
