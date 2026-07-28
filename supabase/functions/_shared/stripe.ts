import Stripe from 'npm:stripe@18'

// Cliente do Stripe compartilhado pelas functions de pagamento (Fase 5).
//
// No Deno é preciso trocar o cliente HTTP padrão (feito para Node) pelo
// baseado em fetch; sem isso o SDK nem inicializa. A verificação de assinatura
// do webhook, pelo mesmo motivo, usa a variante assíncrona com Web Crypto.

export { Stripe }

export function createStripeClient(): Stripe {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY ausente no ambiente da Edge Function.')
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
    httpClient: Stripe.createFetchHttpClient(),
  })
}

/** Provider de criptografia para constructEventAsync no runtime do Deno. */
export function cryptoProvider(): Stripe.CryptoProvider {
  return Stripe.createSubtleCryptoProvider()
}

/** Reais para centavos, que é a unidade que o Stripe cobra. */
export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100)
}
