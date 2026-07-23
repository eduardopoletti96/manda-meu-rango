import { useId, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/features/restaurant/restaurant-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SectionFooter, type SectionFeedback } from './SectionFooter'

export function FulfillmentCard({
  restaurant,
  onSaved,
}: {
  restaurant: Restaurant
  onSaved: () => void
}) {
  const id = useId()
  const [deliveryEnabled, setDeliveryEnabled] = useState(restaurant.delivery_enabled)
  const [pickupEnabled, setPickupEnabled] = useState(restaurant.pickup_enabled)
  const [deliveryFee, setDeliveryFee] = useState(String(restaurant.delivery_fee))
  const [minOrderValue, setMinOrderValue] = useState(String(restaurant.min_order_value))
  const [prepTime, setPrepTime] = useState(String(restaurant.avg_prep_time_minutes))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<SectionFeedback>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    if (!deliveryEnabled && !pickupEnabled) {
      setFeedback({
        kind: 'error',
        text: 'Habilite pelo menos uma modalidade: entrega ou retirada.',
      })
      return
    }
    const fee = Number(deliveryFee.replace(',', '.'))
    const minOrder = Number(minOrderValue.replace(',', '.'))
    const prep = Number(prepTime)
    if (Number.isNaN(fee) || fee < 0 || Number.isNaN(minOrder) || minOrder < 0) {
      setFeedback({ kind: 'error', text: 'Confira os valores informados.' })
      return
    }
    if (!Number.isInteger(prep) || prep <= 0) {
      setFeedback({ kind: 'error', text: 'O tempo de preparo deve ser um número de minutos.' })
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({
        delivery_enabled: deliveryEnabled,
        pickup_enabled: pickupEnabled,
        delivery_fee: fee,
        min_order_value: minOrder,
        avg_prep_time_minutes: prep,
      })
      .eq('id', restaurant.id)
    setSaving(false)
    if (error) {
      setFeedback({ kind: 'error', text: 'Não foi possível salvar. Tente de novo.' })
      return
    }
    setFeedback({ kind: 'success', text: 'Salvo ✓' })
    onSaved()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrega e retirada</CardTitle>
        <CardDescription>Modalidades, taxa, pedido mínimo e tempo de preparo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={`${id}-delivery`}>Entrega (delivery)</Label>
              <Switch
                id={`${id}-delivery`}
                checked={deliveryEnabled}
                onCheckedChange={setDeliveryEnabled}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={`${id}-pickup`}>Retirada no balcão</Label>
              <Switch
                id={`${id}-pickup`}
                checked={pickupEnabled}
                onCheckedChange={setPickupEnabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-fee`}>Taxa de entrega (R$)</Label>
              <Input
                id={`${id}-fee`}
                inputMode="decimal"
                disabled={!deliveryEnabled}
                value={deliveryFee}
                onChange={(event) => setDeliveryFee(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-min`}>Pedido mínimo (R$)</Label>
              <Input
                id={`${id}-min`}
                inputMode="decimal"
                value={minOrderValue}
                onChange={(event) => setMinOrderValue(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-prep`}>Preparo médio (min)</Label>
              <Input
                id={`${id}-prep`}
                inputMode="numeric"
                value={prepTime}
                onChange={(event) => setPrepTime(event.target.value)}
              />
            </div>
          </div>
          <SectionFooter saving={saving} feedback={feedback} />
        </form>
      </CardContent>
    </Card>
  )
}
