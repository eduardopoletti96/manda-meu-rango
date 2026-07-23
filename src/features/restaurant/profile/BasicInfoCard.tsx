import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/features/restaurant/restaurant-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SectionFooter, type SectionFeedback } from './SectionFooter'

export function BasicInfoCard({
  restaurant,
  onSaved,
}: {
  restaurant: Restaurant
  onSaved: () => void
}) {
  const [name, setName] = useState(restaurant.name)
  const [description, setDescription] = useState(restaurant.description ?? '')
  const [phone, setPhone] = useState(restaurant.phone ?? '')
  const [email, setEmail] = useState(restaurant.email ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<SectionFeedback>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
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
        <CardTitle>Dados básicos</CardTitle>
        <CardDescription>Nome, descrição e contato exibidos na sua página.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="basic-name">Nome do restaurante</Label>
            <Input
              id="basic-name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="basic-description">Descrição</Label>
            <Textarea
              id="basic-description"
              maxLength={300}
              placeholder="Conte em poucas linhas o que sua cozinha faz de melhor."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="basic-phone">Telefone / WhatsApp</Label>
              <Input
                id="basic-phone"
                type="tel"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="basic-email">E-mail de contato</Label>
              <Input
                id="basic-email"
                type="email"
                placeholder="contato@seurestaurante.com.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          <SectionFooter saving={saving} feedback={feedback} />
        </form>
      </CardContent>
    </Card>
  )
}
