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

function base64urlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  )
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
  const key = await hmacKey(secret, 'sign')
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  return `${signingInput}.${base64url(new Uint8Array(signature))}`
}

// Verificação do mesmo token, feita pela própria Edge Function (Fase 5).
//
// Quem grava dados do cliente (create-order) roda com service role, fora da
// RLS, então precisa saber *por conta própria* de quem é o pedido. Validar aqui
// — em vez de confiar no gateway ou no PostgREST — desacopla a escrita das
// chaves do projeto: se o JWT secret legado for revogado um dia, só o caminho
// de leitura (endereços via PostgREST) precisa migrar.
//
// O token chega no header x-customer-token, não no Authorization: o
// Authorization continua levando a anon key, que é o que o gateway verifica.

export type VerifiedCustomer = {
  customerId: string
  name: string
  phone: string
}

export async function verifyCustomerJwt(
  token: string,
  secret: string,
): Promise<VerifiedCustomer | null> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  const [headerPart, payloadPart, signaturePart] = parts

  let header: { alg?: string }
  let payload: { customer_id?: unknown; name?: unknown; phone?: unknown; exp?: unknown }
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlToBytes(headerPart)))
    payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(payloadPart)))
  } catch {
    return null
  }

  // Só aceitamos o algoritmo que nós mesmos emitimos: sem isso, um token com
  // alg 'none' (ou outro) entraria pela porta da frente.
  if (header.alg !== 'HS256') {
    return null
  }

  const key = await hmacKey(secret, 'verify')
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64urlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  )
  if (!valid) {
    return null
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    return null
  }
  if (typeof payload.customer_id !== 'string' || payload.customer_id.length === 0) {
    return null
  }

  return {
    customerId: payload.customer_id,
    name: typeof payload.name === 'string' ? payload.name : '',
    phone: typeof payload.phone === 'string' ? payload.phone : '',
  }
}
