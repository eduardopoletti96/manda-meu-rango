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
import type { MenuItem } from './types'

export function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: MenuItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    const { error: deleteError } = await supabase.from('menu_items').delete().eq('id', item.id)
    setDeleting(false)
    if (deleteError) {
      setError('Não foi possível excluir o item. Tente de novo.')
      return
    }
    onOpenChange(false)
    onDeleted()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir "{item.name}"?</DialogTitle>
          <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
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
            {deleting ? 'Excluindo…' : 'Excluir item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
