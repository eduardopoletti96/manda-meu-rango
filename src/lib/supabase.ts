import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas — copie .env.example para .env e preencha.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente que fala em nome do cliente identificado por telefone (Fase 4).
//
// Ele não tem sessão no Supabase Auth: a identidade é o JWT emitido pelo
// verify-phone-token, com o claim customer_id que a RLS lê. O supabase-js só
// preenche o Authorization quando o header ainda não existe, então mandá-lo
// aqui basta para o PostgREST enxergar o cliente.
//
// Instância separada da `supabase` de propósito: no mesmo navegador pode haver
// um dono de restaurante logado no painel, e as duas identidades não podem se
// misturar. persistSession fica desligado justamente por isso.
let cached: { token: string; client: SupabaseClient<Database> } | null = null

export function customerSupabase(token: string): SupabaseClient<Database> {
  if (cached?.token === token) {
    return cached.client
  }
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  cached = { token, client }
  return client
}
