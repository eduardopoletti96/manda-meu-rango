import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { categoryItemCount, type CategoryWithCount } from './types'

export function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
  onDeleted,
}: {
  category: CategoryWithCount
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const itemCount = categoryItemCount(category)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
    setDeleting(false)
    if (deleteError) {
      setError('Não foi possível excluir a categoria. Tente de novo.')
      return
    }
    onOpenChange(false)
    onDeleted()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir "{category.name}"?</DialogTitle>
          <DialogDescription>
            {itemCount > 0
              ? `Esta categoria tem ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}, que ${
                  itemCount === 1 ? 'será excluído' : 'serão excluídos'
                } junto com ela. Essa ação não pode ser desfeita.`
              : 'Essa ação não pode ser desfeita.'}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Excluindo…' : itemCount > 0 ? `Excluir categoria e ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Excluir categoria'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
