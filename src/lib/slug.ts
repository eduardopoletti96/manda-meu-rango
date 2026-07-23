// Regras de slug alinhadas às constraints de public.restaurants:
// minúsculas, dígitos e hífens não adjacentes, 3 a 63 caracteres.
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const SLUG_MIN_LENGTH = 3
export const SLUG_MAX_LENGTH = 63

export function isValidSlug(value: string): boolean {
  return (
    value.length >= SLUG_MIN_LENGTH &&
    value.length <= SLUG_MAX_LENGTH &&
    SLUG_REGEX.test(value)
  )
}

// Deriva um slug a partir do nome do restaurante ("Cantina da Nonna" →
// "cantina-da-nonna"), removendo acentos e símbolos.
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
}
