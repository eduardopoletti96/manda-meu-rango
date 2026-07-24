import type { BusinessHour, OpenState } from './store-context'

type HourWindow = Pick<BusinessHour, 'weekday' | 'is_closed' | 'opens_at' | 'closes_at'>

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

// Estado de funcionamento na hora local do navegador (MVP atende só o Brasil;
// fuso próprio por restaurante fica para depois). Fechamento menor ou igual à
// abertura indica janela que vira a madrugada (ex.: 18:00–02:00): vale do
// horário de abertura até o fim do dia e continua no começo do dia seguinte.
export function getOpenState(hours: HourWindow[], now: Date): OpenState {
  const windows = hours.flatMap((row) =>
    !row.is_closed && row.opens_at && row.closes_at
      ? [{ weekday: row.weekday, opens: toMinutes(row.opens_at), closes: toMinutes(row.closes_at) }]
      : [],
  )
  if (windows.length === 0) {
    return 'unknown'
  }
  const minutes = now.getHours() * 60 + now.getMinutes()
  const today = now.getDay()
  const yesterday = (today + 6) % 7
  const open = windows.some(({ weekday, opens, closes }) => {
    const overnight = closes <= opens
    if (weekday === today) {
      return overnight ? minutes >= opens : minutes >= opens && minutes < closes
    }
    return weekday === yesterday && overnight && minutes < closes
  })
  return open ? 'open' : 'closed'
}

/** Janela de hoje para exibição ("Hoje: 18:00 às 23:00"); null se fechado hoje. */
export function todayWindow(hours: HourWindow[], now: Date): { opens: string; closes: string } | null {
  const row = hours.find((entry) => entry.weekday === now.getDay())
  if (!row || row.is_closed || !row.opens_at || !row.closes_at) {
    return null
  }
  // time do Postgres chega como HH:MM:SS; exibimos HH:MM.
  return { opens: row.opens_at.slice(0, 5), closes: row.closes_at.slice(0, 5) }
}
