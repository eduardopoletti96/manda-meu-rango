const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(value: number): string {
  return brl.format(value)
}

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** "19:42" — hora local, que é a que o operador tem no relógio da parede. */
export function formatTime(iso: string | null | undefined): string {
  return iso ? time.format(new Date(iso)) : ''
}

/** "31/07 19:42" — para quando o dia importa (pedido virado da noite anterior). */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : ''
}
