// 4.2 — Validação do token e emissão da identidade do cliente.
//
// Confere o código contra o hash guardado (respeitando expiração e limite de
// tentativas), cria/atualiza o cliente pelo telefone e devolve um JWT assinado
// com o claim customer_id — a identidade que a RLS usa em
// public.current_customer_id(). A partir daí o cliente está "autenticado" sem
// nunca ter conta no Supabase Auth.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { normalizeBrazilPhone } from '../_shared/phone.ts'
import { hashCode, timingSafeEqualHex } from '../_shared/hash.ts'
import { signCustomerJwt } from '../_shared/jwt.ts'

const MAX_ATTEMPTS = 5
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 dias

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

  const jwtSecret = Deno.env.get('CUSTOMER_JWT_SECRET')
  if (!jwtSecret) {
    console.error('[verify-phone-token] CUSTOMER_JWT_SECRET ausente.')
    return errorResponse('Serviço mal configurado.', 500)
  }

  let body: { phone?: string; name?: string; code?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Corpo inválido: esperado JSON.')
  }

  const phone = normalizeBrazilPhone(body.phone ?? '')
  if (!phone) {
    return errorResponse('Telefone inválido. Informe DDD + número.')
  }
  const name = (body.name ?? '').trim()
  if (name.length === 0) {
    return errorResponse('Informe seu nome.')
  }
  const code = (body.code ?? '').trim()
  if (!/^[0-9]{6}$/.test(code)) {
    return errorResponse('Código inválido: são 6 dígitos.')
  }

  const admin = createAdminClient()

  // Token ativo mais recente do telefone (o índice cobre esta ordenação).
  const { data: verification, error: fetchError } = await admin
    .from('phone_verifications')
    .select('id, token_hash, expires_at, attempts, consumed_at')
    .eq('phone', phone)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    console.error('[verify-phone-token] erro ao buscar token:', fetchError.message)
    return errorResponse('Não foi possível validar agora. Tente novamente.', 500)
  }
  if (!verification) {
    return errorResponse('Nenhum código pendente. Solicite um novo.', 400)
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    return errorResponse('Código expirado. Solicite um novo.', 400)
  }
  if (verification.attempts >= MAX_ATTEMPTS) {
    return errorResponse('Muitas tentativas. Solicite um novo código.', 429)
  }

  const candidateHash = await hashCode(code, resolvePepper())
  if (!timingSafeEqualHex(candidateHash, verification.token_hash)) {
    // Conta a tentativa falha; ao chegar no limite, o próximo pedido é barrado.
    await admin
      .from('phone_verifications')
      .update({ attempts: verification.attempts + 1 })
      .eq('id', verification.id)
    const remaining = MAX_ATTEMPTS - (verification.attempts + 1)
    return errorResponse(
      remaining > 0
        ? `Código incorreto. Você ainda tem ${remaining} tentativa(s).`
        : 'Código incorreto. Solicite um novo.',
      400,
    )
  }

  // Sucesso: consome o token para não ser reutilizado.
  await admin
    .from('phone_verifications')
    .update({ attempts: verification.attempts + 1, consumed_at: new Date().toISOString() })
    .eq('id', verification.id)

  // Cria ou atualiza o cliente pelo telefone (identidade única).
  const { data: customer, error: upsertError } = await admin
    .from('customers')
    .upsert(
      { name, phone, phone_verified_at: new Date().toISOString() },
      { onConflict: 'phone' },
    )
    .select('id, name, phone')
    .single()

  if (upsertError || !customer) {
    console.error('[verify-phone-token] erro ao gravar cliente:', upsertError?.message)
    return errorResponse('Não foi possível concluir a identificação. Tente novamente.', 500)
  }

  const token = await signCustomerJwt(
    { customerId: customer.id, name: customer.name, phone: customer.phone },
    jwtSecret,
    SESSION_TTL_SECONDS,
  )

  return jsonResponse({
    token,
    expiresInSeconds: SESSION_TTL_SECONDS,
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
  })
})
