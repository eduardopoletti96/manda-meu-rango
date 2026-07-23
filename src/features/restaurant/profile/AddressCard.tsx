import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/features/restaurant/restaurant-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionFooter, type SectionFeedback } from './SectionFooter'

export function AddressCard({
  restaurant,
  onSaved,
}: {
  restaurant: Restaurant
  onSaved: () => void
}) {
  const [zipCode, setZipCode] = useState(restaurant.zip_code ?? '')
  const [street, setStreet] = useState(restaurant.street ?? '')
  const [number, setNumber] = useState(restaurant.number ?? '')
  const [complement, setComplement] = useState(restaurant.complement ?? '')
  const [district, setDistrict] = useState(restaurant.district ?? '')
  const [city, setCity] = useState(restaurant.city ?? '')
  const [state, setState] = useState(restaurant.state ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<SectionFeedback>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({
        zip_code: zipCode.trim() || null,
        street: street.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        state: state.trim().toUpperCase() || null,
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
        <CardTitle>Endereço</CardTitle>
        <CardDescription>De onde os pedidos saem — e onde o cliente retira.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="address-zip">CEP</Label>
              <Input
                id="address-zip"
                inputMode="numeric"
                maxLength={9}
                placeholder="01234-567"
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="address-street">Rua / Avenida</Label>
              <Input
                id="address-street"
                value={street}
                onChange={(event) => setStreet(event.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="address-number">Número</Label>
              <Input
                id="address-number"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="address-complement">Complemento</Label>
              <Input
                id="address-complement"
                placeholder="Loja 2, fundos…"
                value={complement}
                onChange={(event) => setComplement(event.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="address-district">Bairro</Label>
              <Input
                id="address-district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address-city">Cidade</Label>
              <Input
                id="address-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address-state">UF</Label>
              <Input
                id="address-state"
                maxLength={2}
                placeholder="SP"
                className="uppercase"
                value={state}
                onChange={(event) => setState(event.target.value)}
              />
            </div>
          </div>
          <SectionFooter saving={saving} feedback={feedback} />
        </form>
      </CardContent>
    </Card>
  )
}
