// 6.6 — Aviso ao cliente a cada mudança de status do pedido.
//
// Quem chama é o painel, logo depois de mover o card. Poderia ser uma trigger
// no banco, mas aí o envio dependeria de pg_net e de guardar a service role
// key dentro do Postgres — mais peças e mais segredo exposto para o mesmo
// resultado. A garantia de "uma mensagem por transição" não vem de quem
// chama: vem do índice único em notification_logs (ver _shared/order-notifications.ts).
//
// O corpo diz apenas *qual* pedido; o status é lido do banco. Ninguém consegue
// pedir "avise que ficou pronto" para um pedido que ainda está em produção.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { notifyOrderStatus } from '../_shared/order-notifications.ts'

type Admin = ReturnType<typeof createAdminClient>

/** O chamador pode avisar sobre este pedido? */
async function authorize(admin: Admin, req: Request, orderId: string): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token) {
    return 'Autenticação necessária.'
  }

  // Chamada interna de outra Edge Function (o webhook do Stripe).
  if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return null
  }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    return 'Sessão inválida.'
  }

  // Ser dono ou funcionário do restaurante do pedido é o que autoriza — a RLS
  // não vale aqui, porque esta função roda com service role.
  const { data: order } = await admin
    .from('orders')
    .select('restaurant_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) {
    return 'Pedido não encontrado.'
  }

  const { data: membership } = await admin
    .from('restaurant_users')
    .select('user_id')
    .eq('restaurant_id', order.restaurant_id)
    .eq('user_id', data.user.id)
    .maybeSingle()

  return membership ? null : 'Este pedido não é do seu restaurante.'
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) {
    return preflight
  }
  if (req.method !== 'POST') {
    return errorResponse('Método não permitido.', 405)
  }

  let body: { orderId?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Corpo inválido: esperado JSON.')
  }

  const orderId = (body.orderId ?? '').trim()
  if (!orderId) {
    return errorResponse('Informe o pedido.')
  }

  const admin = createAdminClient()

  const denial = await authorize(admin, req, orderId)
  if (denial) {
    return errorResponse(denial, 403)
  }

  const result = await notifyOrderStatus(admin, orderId)
  console.log(`[notify-order-status] pedido ${orderId}: ${JSON.stringify(result)}`)

  // Mesmo em falha de envio a resposta é 200: o pedido já mudou de status e o
  // painel não deve mostrar erro por causa do aviso. A falha fica no log.
  return jsonResponse(result)
})
