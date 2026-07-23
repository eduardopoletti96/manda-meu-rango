import { useEffect, useId, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SectionFooter, type SectionFeedback } from './SectionFooter'

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type DayRow = {
  weekday: number
  open: boolean
  opensAt: string
  closesAt: string
}

const defaultRows: DayRow[] = WEEKDAYS.map((_, weekday) => ({
  weekday,
  open: false,
  opensAt: '18:00',
  closesAt: '23:00',
}))

export function BusinessHoursCard({ restaurantId }: { restaurantId: string }) {
  const id = useId()
  const [rows, setRows] = useState<DayRow[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<SectionFeedback>(null)

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('business_hours')
      .select('weekday, is_closed, opens_at, closes_at')
      .eq('restaurant_id', restaurantId)
      .then(({ data, error }) => {
        if (cancelled) {
          return
        }
        if (error) {
          setFeedback({ kind: 'error', text: 'Não foi possível carregar os horários.' })
          setRows(defaultRows)
          return
        }
        setRows(
          defaultRows.map((base) => {
            const saved = data.find((row) => row.weekday === base.weekday)
            if (!saved) {
              return base
            }
            return {
              weekday: base.weekday,
              open: !saved.is_closed,
              // time do Postgres chega como HH:MM:SS; o input usa HH:MM.
              opensAt: saved.opens_at?.slice(0, 5) ?? base.opensAt,
              closesAt: saved.closes_at?.slice(0, 5) ?? base.closesAt,
            }
          }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [restaurantId])

  function updateRow(weekday: number, patch: Partial<DayRow>) {
    setRows((current) =>
      current
        ? current.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row))
        : current,
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rows) {
      return
    }
    setFeedback(null)
    setSaving(true)
    const { error } = await supabase.from('business_hours').upsert(
      rows.map((row) => ({
        restaurant_id: restaurantId,
        weekday: row.weekday,
        is_closed: !row.open,
        opens_at: row.open ? row.opensAt : null,
        closes_at: row.open ? row.closesAt : null,
      })),
      { onConflict: 'restaurant_id,weekday' },
    )
    setSaving(false)
    if (error) {
      setFeedback({ kind: 'error', text: 'Não foi possível salvar os horários. Tente de novo.' })
      return
    }
    setFeedback({ kind: 'success', text: 'Horários salvos ✓' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário de funcionamento</CardTitle>
        <CardDescription>
          Fora do horário, a página avisa que o restaurante está fechado. Horários que viram a
          madrugada (ex.: 18:00 às 02:00) são aceitos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <div className="bg-muted h-40 animate-pulse rounded-md" />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {rows.map((row) => (
              <div
                key={row.weekday}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3 last:border-b-0"
              >
                <div className="flex w-36 items-center gap-3">
                  <Switch
                    id={`${id}-open-${row.weekday}`}
                    checked={row.open}
                    onCheckedChange={(open) => updateRow(row.weekday, { open })}
                  />
                  <Label htmlFor={`${id}-open-${row.weekday}`}>{WEEKDAYS[row.weekday]}</Label>
                </div>
                {row.open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      required
                      className="w-28"
                      aria-label={`Abre ${WEEKDAYS[row.weekday]}`}
                      value={row.opensAt}
                      onChange={(event) => updateRow(row.weekday, { opensAt: event.target.value })}
                    />
                    <span className="text-muted-foreground text-sm">às</span>
                    <Input
                      type="time"
                      required
                      className="w-28"
                      aria-label={`Fecha ${WEEKDAYS[row.weekday]}`}
                      value={row.closesAt}
                      onChange={(event) => updateRow(row.weekday, { closesAt: event.target.value })}
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Fechado</span>
                )}
              </div>
            ))}
            <SectionFooter saving={saving} feedback={feedback} label="Salvar horários" />
          </form>
        )}
      </CardContent>
    </Card>
  )
}
