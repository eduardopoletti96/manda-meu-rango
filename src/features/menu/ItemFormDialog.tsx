import { useId, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { ImageUploadInput } from '@/components/shared/ImageUploadInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { MenuItem } from './types'

// numeric(10, 2) no banco: até 8 dígitos inteiros.
const MAX_PRICE = 99_999_999.99

function parsePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  // Com vírgula ("1.234,56"), pontos são separador de milhar; sem vírgula
  // ("45.90"), o ponto é o separador decimal.
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const parsed = Number(normalized)
  if (Number.isNaN(parsed) || parsed < 0 || parsed > MAX_PRICE) {
    return null
  }
  return Math.round(parsed * 100) / 100
}

// Criação e edição de item. O pai remonta o dialog (render condicional)
// a cada abertura, então o estado inicial sempre reflete o item atual.
export function ItemFormDialog({
  restaurantId,
  categoryId,
  item,
  nextSortOrder,
  open,
  onOpenChange,
  onSaved,
}: {
  restaurantId: string
  categoryId: string
  item: MenuItem | null
  nextSortOrder: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const id = useId()
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item ? item.price.toFixed(2).replace('.', ',') : '')
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? null)
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const parsedPrice = parsePrice(price)
    if (parsedPrice === null) {
      setError('Informe um preço válido (ex.: 45,90).')
      return
    }
    setSaving(true)
    const values = {
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      image_url: imageUrl,
      is_available: isAvailable,
    }
    const { error: saveError } = item
      ? await supabase.from('menu_items').update(values).eq('id', item.id)
      : await supabase.from('menu_items').insert({
          ...values,
          restaurant_id: restaurantId,
          category_id: categoryId,
          sort_order: nextSortOrder,
        })
    setSaving(false)
    if (saveError) {
      setError('Não foi possível salvar o item. Tente de novo.')
      return
    }
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Editar item' : 'Novo item'}</DialogTitle>
          <DialogDescription>
            O item aparece no cardápio da categoria com nome, imagem e preço.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Nome</Label>
            <Input
              id={`${id}-name`}
              required
              maxLength={80}
              placeholder="Ex.: Margherita"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-description`}>Descrição (opcional)</Label>
            <Textarea
              id={`${id}-description`}
              maxLength={300}
              placeholder="Molho de tomate, muçarela e manjericão fresco."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-price`}>Preço (R$)</Label>
            <Input
              id={`${id}-price`}
              required
              inputMode="decimal"
              placeholder="45,90"
              className="max-w-40"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Imagem (opcional)</Label>
            <ImageUploadInput
              bucket="items"
              pathPrefix={restaurantId}
              value={imageUrl}
              onChange={setImageUrl}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`${id}-available`}>Disponível para pedidos</Label>
            <Switch
              id={`${id}-available`}
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
          </div>
          {error ? (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
