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
import type { CategoryWithCount } from './types'

// Criação e edição de categoria. O pai deve remontar o dialog (via key)
// ao trocar a categoria editada, para reinicializar o formulário.
export function CategoryFormDialog({
  restaurantId,
  category,
  nextSortOrder,
  open,
  onOpenChange,
  onSaved,
}: {
  restaurantId: string
  category: CategoryWithCount | null
  /** Posição de uma categoria nova no fim da lista. */
  nextSortOrder: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const id = useId()
  const [name, setName] = useState(category?.name ?? '')
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? null)
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const values = {
      name: name.trim(),
      image_url: imageUrl,
      is_active: isActive,
    }
    const { error: saveError } = category
      ? await supabase.from('categories').update(values).eq('id', category.id)
      : await supabase
          .from('categories')
          .insert({ ...values, restaurant_id: restaurantId, sort_order: nextSortOrder })
    setSaving(false)
    if (saveError) {
      setError(
        saveError.code === '23505'
          ? 'Já existe uma categoria com esse nome.'
          : 'Não foi possível salvar a categoria. Tente de novo.',
      )
      return
    }
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogDescription>
            A categoria vira um quadro no grid da sua página, com título e imagem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Nome</Label>
            <Input
              id={`${id}-name`}
              required
              maxLength={60}
              placeholder="Ex.: Pizzas salgadas"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Imagem (opcional)</Label>
            <ImageUploadInput
              bucket="categories"
              pathPrefix={restaurantId}
              value={imageUrl}
              onChange={setImageUrl}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`${id}-active`}>Categoria ativa</Label>
            <Switch id={`${id}-active`} checked={isActive} onCheckedChange={setIsActive} />
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
