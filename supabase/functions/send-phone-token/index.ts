// 4.2 — Envio do token de verificação por WhatsApp.
//
// Gera um código de 6 dígitos, guarda apenas o hash (expira em 5 min), aplica
// rate limit por telefone e dispara a mensagem pelo provedor de WhatsApp,
// registrando em notification_logs. O código em claro nunca é persistido nem
// devolvido — exceto em modo de desenvolvimento explícito (WHATSAPP_DEV_ECHO)
// com o provedor fake, para facilitar o teste sem WhatsApp real.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { normalizeBrazilPhone } from '../_shared/phone.ts'
import { generateCode, hashCode } from '../_shared/hash.ts'
import { sendAndLogWhatsApp } from '../_shared/notify.ts'
import { isRealProviderConfigured } from '../_shared/whatsapp.ts'

const TOKEN_TTL_SECONDS = 5 * 60
// Rate limit: no máximo 1 envio por minuto e 5 por hora, por telefone.
const SHORT_WINDOW_SECONDS = 60
const LONG_WINDOW_SECONDS = 60 * 60
const LONG_WINDOW_MAX = 5

function resolvePepper(): string {
  return Deno.env.get('PHONE_TOKEN_PEPPER') ?? Deno.env.get('CUSTOMER_JWT_SECRET') ?? ''
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) {
    return preflight
  }
  if (req.method !== 'POST') {
    return errorResponse('Método não permitido.', 405)
  }

  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Corpo inválido: esperado JSON.')
  }

  const phone = normalizeBrazilPhone(body.phone ?? '')
  if (!phone) {
    return errorResponse('Telefone inválido. Informe DDD + número.')
  }

  const admin = createAdminClient()
  const now = Date.now()

  // Rate limit: conta os envios recentes deste telefone.
  const { count: recentShort, error: shortError } = await admin
    .from('phone_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', new Date(now - SHORT_WINDOW_SECONDS * 1000).toISOString())
  if (shortError) {
    console.error('[send-phone-token] erro no rate limit curto:', shortError.message)
    return errorResponse('Não foi possível processar agora. Tente novamente.', 500)
  }
  if ((recentShort ?? 0) >= 1) {
    return errorResponse('Aguarde um instante antes de pedir um novo código.', 429)
  }

  const { count: recentLong, error: longError } = await admin
    .from('phone_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', new Date(now - LONG_WINDOW_SECONDS * 1000).toISOString())
  if (longError) {
    console.error('[send-phone-token] erro no rate limit longo:', longError.message)
    return errorResponse('Não foi possível processar agora. Tente novamente.', 500)
  }
  if ((recentLong ?? 0) >= LONG_WINDOW_MAX) {
    return errorResponse('Muitas solicitações. Tente novamente mais tarde.', 429)
  }

  // Gera e persiste o token (só o hash).
  const code = generateCode()
  const tokenHash = await hashCode(code, resolvePepper())
  const expiresAt = new Date(now + TOKEN_TTL_SECONDS * 1000).toISOString()

  const { error: insertError } = await admin.from('phone_verifications').insert({
    phone,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })
  if (insertError) {
    console.error('[send-phone-token] erro ao gravar token:', insertError.message)
    return errorResponse('Não foi possível gerar o código. Tente novamente.', 500)
  }

  // Envia pelo WhatsApp e registra (payload de log sem o código em claro).
  const result = await sendAndLogWhatsApp(admin, {
    to: phone,
    template: 'verification_code',
    renderParams: { code },
    logPayload: { purpose: 'phone_verification' },
  })
  if (result.status === 'failed') {
    return errorResponse('Não foi possível enviar o código pelo WhatsApp. Tente novamente.', 502)
  }

  // Eco do código só em desenvolvimento (provedor fake + flag explícita).
  const devEcho =
    Deno.env.get('WHATSAPP_DEV_ECHO') === 'true' && !isRealProviderConfigured()

  return jsonResponse({
    ok: true,
    expiresInSeconds: TOKEN_TTL_SECONDS,
    ...(devEcho ? { devCode: code } : {}),
  })
})
