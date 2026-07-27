// Geração e verificação do código de 6 dígitos.
//
// O código em claro nunca é persistido: guardamos apenas o hash SHA-256 com um
// "pepper" do ambiente, e comparamos em tempo constante para não vazar
// informação por timing.

/** Código numérico de 6 dígitos, com zeros à esquerda. */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return n.toString().padStart(6, '0')
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashCode(code: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${code}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

/** Comparação em tempo constante de dois hashes hexadecimais. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
