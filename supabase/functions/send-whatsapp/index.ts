// 4.1 — Envio de mensagens de WhatsApp com templates, registro em
// notification_logs e retry.
//
// É um bloco interno, reutilizado pelas notificações de status (Fase 6). Não
// deve ser chamado pelo navegador: exige o service_role no Authorization, que
// só o servidor conhece. O fluxo de verificação de telefone (send-phone-token)
// usa o helper compartilhado sendAndLogWhatsApp direto, sem passar por aqui.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { sendAndLogWhatsApp } from '../_shared/notify.ts'

const VALID_TEMPLATES = new Set(['verification_code'])

function isServiceRoleCaller(req: Request): boolean {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceRoleKey) {
    return false
  }
  const auth = req.headers.get('authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '')
  return bearer === serviceRoleKey
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) {
    return preflight
  }
  if (req.method !== 'POST') {
    return errorResponse('Método não permitido.', 405)
  }
  if (!isServiceRoleCaller(req)) {
    return errorResponse('Não autorizado.', 401)
  }

  let payload: {
    to?: string
    template?: string
    params?: Record<string, string>
    logPayload?: Record<string, unknown> | null
    orderId?: string | null
  }
  try {
    payload = await req.json()
  } catch {
    return errorResponse('Corpo inválido: esperado JSON.')
  }

  const { to, template, params = {}, logPayload = null, orderId = null } = payload
  if (!to || !/^\+[1-9][0-9]{7,14}$/.test(to)) {
    return errorResponse('Destino inválido: informe um número em formato E.164.')
  }
  if (!template || !VALID_TEMPLATES.has(template)) {
    return errorResponse('Template desconhecido.')
  }

  const admin = createAdminClient()
  const result = await sendAndLogWhatsApp(admin, {
    to,
    template: template as 'verification_code',
    renderParams: params,
    logPayload,
    orderId,
  })

  const status = result.status === 'sent' ? 200 : 502
  return jsonResponse(result, status)
})
