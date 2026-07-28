// 5.2 — Consulta de CEP para autopreencher o endereço.
//
// ViaCEP é a fonte principal (§2 do documento base); a BrasilAPI entra quando
// o ViaCEP falha ou está fora do ar. Se as duas falharem, a tela oferece o
// preenchimento manual — a busca é uma conveniência, nunca um bloqueio.

export type CepLookup = {
  zipCode: string
  street: string
  district: string
  city: string
  state: string
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Máscara de exibição: 90000-000. */
export function maskCep(value: string): string {
  const d = digitsOnly(value).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

export function isValidCep(value: string): boolean {
  return digitsOnly(value).length === 8
}

const TIMEOUT_MS = 6000

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

async function fromViaCep(cep: string): Promise<CepLookup | null> {
  const data = (await fetchJson(`https://viacep.com.br/ws/${cep}/json/`)) as {
    erro?: boolean | string
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }
  // CEP inexistente volta como 200 com { "erro": "true" } — não como 404.
  if (data.erro === true || data.erro === 'true' || !data.localidade) {
    return null
  }
  return {
    zipCode: cep,
    street: data.logradouro ?? '',
    district: data.bairro ?? '',
    city: data.localidade,
    state: (data.uf ?? '').toUpperCase(),
  }
}

async function fromBrasilApi(cep: string): Promise<CepLookup | null> {
  const data = (await fetchJson(`https://brasilapi.com.br/api/v1/cep/v1/${cep}`)) as {
    street?: string
    neighborhood?: string
    city?: string
    state?: string
  }
  if (!data.city) {
    return null
  }
  return {
    zipCode: cep,
    street: data.street ?? '',
    district: data.neighborhood ?? '',
    city: data.city,
    state: (data.state ?? '').toUpperCase(),
  }
}

export type CepResult =
  { ok: true; address: CepLookup } | { ok: false; reason: 'invalid' | 'not-found' | 'unavailable' }

export async function lookupCep(value: string): Promise<CepResult> {
  const cep = digitsOnly(value)
  if (cep.length !== 8) {
    return { ok: false, reason: 'invalid' }
  }

  // Um CEP que o ViaCEP não conhece às vezes existe na BrasilAPI (ela agrega
  // mais de uma base), então tentamos as duas antes de dizer que não existe.
  let everyProviderFailed = true

  for (const provider of [fromViaCep, fromBrasilApi]) {
    try {
      const address = await provider(cep)
      everyProviderFailed = false
      if (address) {
        return { ok: true, address }
      }
    } catch {
      // rede fora, timeout ou erro do provedor: tenta o próximo
    }
  }

  return { ok: false, reason: everyProviderFailed ? 'unavailable' : 'not-found' }
}
