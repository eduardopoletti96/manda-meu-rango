// Emissão do JWT do cliente (HS256, assinado com Web Crypto — sem dependência
// externa).
//
// O cliente não tem conta no Supabase Auth. Depois de verificar o telefone,
// emitimos um JWT assinado com o *JWT secret do projeto* carregando o claim
// customer_id, que a RLS lê em public.current_customer_id(). O PostgREST valida
// a assinatura contra esse mesmo secret e assume o papel do claim `role`.
//
// Usamos role='authenticated' (grants padrão de tabela + convenção do
// Supabase); a policy de insert de restaurants foi endurecida para negar
// tokens de cliente, então isso não abre criação de restaurante.
//
// O secret vem de CUSTOMER_JWT_SECRET (definido via `supabase secrets set`).
// Nomes com prefixo SUPABASE_ são reservados pela CLI, por isso o nome próprio;
// o valor é o "JWT Secret" do dashboard → Settings → API.

function base64url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlJson(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)))
}

export type CustomerClaims = {
  customerId: string
  name: string
  phone: string
}

export async function signCustomerJwt(
  claims: CustomerClaims,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: 'manda-meu-rango',
    sub: claims.customerId,
    role: 'authenticated',
    aud: 'authenticated',
    customer_id: claims.customerId,
    name: claims.name,
    phone: claims.phone,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${base64url(new Uint8Array(signature))}`
}
