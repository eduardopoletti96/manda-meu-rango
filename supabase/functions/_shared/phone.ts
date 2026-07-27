// Normalização de telefone para E.164 (MVP Brasil).
//
// O banco guarda o telefone como identidade única do cliente
// (customers.phone com check E.164). Normalizar na borda evita cadastrar o
// mesmo número em formatos diferentes ("(51) 99999-9999", "51999999999",
// "+55 51 99999-9999" → +5551999999999).

/** Retorna o número em E.164 (+55DDDNUMERO) ou null se não parecer válido. */
export function normalizeBrazilPhone(input: string): string | null {
  const digits = (input ?? '').replace(/\D/g, '')

  // Remove o código do país quando já veio com ele.
  let national = digits
  if (national.startsWith('55') && (national.length === 12 || national.length === 13)) {
    national = national.slice(2)
  }

  // national = DDD (2) + número (8 fixo ou 9 celular) = 10 ou 11 dígitos.
  if (national.length !== 10 && national.length !== 11) {
    return null
  }

  // DDDs brasileiros vão de 11 a 99.
  const ddd = Number(national.slice(0, 2))
  if (ddd < 11) {
    return null
  }

  return `+55${national}`
}
