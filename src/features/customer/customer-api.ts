import { supabase } from '@/lib/supabase'
import type { IdentifiedCustomer } from '@/stores/customer-session-store'

// Chamadas às Edge Functions de identificação (Fase 4). O supabase-js envia a
// anon key no Authorization por padrão, o que é suficiente: as functions fazem
// a própria lógica de verificação com o service role internamente.

// Em erro HTTP, o corpo { error } que a function retornou fica em
// error.context (um Response); tentamos ler a mensagem amigável de lá.
async function readFunctionError(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response } | null)?.context
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string }
      if (body?.error) {
        return body.error
      }
    } catch {
      // corpo não-JSON: cai no fallback
    }
  }
  return fallback
}

export type SendTokenResult = { ok: true; devCode?: string } | { ok: false; error: string }

export async function sendPhoneToken(phoneDigits: string): Promise<SendTokenResult> {
  const { data, error } = await supabase.functions.invoke('send-phone-token', {
    body: { phone: phoneDigits },
  })
  if (error) {
    return { ok: false, error: await readFunctionError(error, 'Não foi possível enviar o código.') }
  }
  return { ok: true, devCode: (data as { devCode?: string } | null)?.devCode }
}

export type VerifyTokenResult =
  | { ok: true; token: string; customer: IdentifiedCustomer; expiresInSeconds: number }
  | { ok: false; error: string }

export async function verifyPhoneToken(input: {
  phoneDigits: string
  name: string
  code: string
}): Promise<VerifyTokenResult> {
  const { data, error } = await supabase.functions.invoke('verify-phone-token', {
    body: { phone: input.phoneDigits, name: input.name, code: input.code },
  })
  if (error) {
    return { ok: false, error: await readFunctionError(error, 'Não foi possível validar o código.') }
  }
  const payload = data as {
    token: string
    customer: IdentifiedCustomer
    expiresInSeconds: number
  }
  return {
    ok: true,
    token: payload.token,
    customer: payload.customer,
    expiresInSeconds: payload.expiresInSeconds,
  }
}
