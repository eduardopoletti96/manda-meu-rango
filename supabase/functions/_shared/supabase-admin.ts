import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Cliente com service_role: ignora RLS por definição. É o que as Edge
// Functions usam para gravar tokens de verificação, ler o cardápio ao
// recalcular pedidos (Fase 5) e registrar notificações.
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente no
// runtime das Edge Functions do Supabase — não precisam de `secrets set`.
export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar disponíveis no ambiente da Edge Function.',
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
