// Máscara de exibição do telefone brasileiro: (51) 99999-9999.
// A normalização para E.164 acontece no servidor (Edge Function); aqui é só
// apresentação e envio dos dígitos.

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function maskBrazilPhone(value: string): string {
  const d = digitsOnly(value).slice(0, 11)
  if (d.length === 0) {
    return ''
  }
  if (d.length <= 2) {
    return `(${d}`
  }
  if (d.length <= 6) {
    return `(${d.slice(0, 2)}) ${d.slice(2)}`
  }
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Telefone gravado em E.164 (+5551988880001) de volta para exibição:
 * (51) 98888-0001. O banco guarda com o código do país; o painel mostra como
 * quem atende está acostumado a ler.
 */
export function formatE164Brazil(value: string): string {
  const d = digitsOnly(value)
  const national = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
  return maskBrazilPhone(national) || value
}

/** Aceita 10 (fixo) ou 11 (celular) dígitos, com DDD >= 11. */
export function isValidBrazilPhone(value: string): boolean {
  const d = digitsOnly(value)
  return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11
}
