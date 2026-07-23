import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { CategoryFormDialog } from '@/features/menu/CategoryFormDialog'
import { DeleteCategoryDialog } from '@/features/menu/DeleteCategoryDialog'
import { CategoryList } from '@/features/menu/CategoryList'
import type { CategoryWithCount } from '@/features/menu/types'
import { Button } from '@/components/ui/button'

function fetchCategories(restaurantId: string) {
  return supabase
    .from('categories')
    .select('*, menu_items(count)')
    .eq('restaurant_id', restaurantId)
    .order('sort_order')
    .order('created_at')
}

export function MenuAdminPage() {
  const { restaurant } = useRestaurant()
  const restaurantId = restaurant?.id
  const [categories, setCategories] = useState<CategoryWithCount[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryWithCount | null>(null)
  const [deleting, setDeleting] = useState<CategoryWithCount | null>(null)

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchCategories>>) => {
    if (result.error) {
      setError('Não foi possível carregar o cardápio. Recarregue a página.')
      return
    }
    setError(null)
    setCategories(result.data)
  }, [])

  useEffect(() => {
    if (!restaurantId) {
      return
    }
    let cancelled = false
    void fetchCategories(restaurantId).then((result) => {
      if (!cancelled) {
        apply(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [restaurantId, apply])

  const reload = useCallback(async () => {
    if (restaurantId) {
      apply(await fetchCategories(restaurantId))
    }
  }, [restaurantId, apply])

  // Reordenação otimista: atualiza a tela na hora e persiste só as
  // posições que mudaram.
  function handleReorder(next: CategoryWithCount[]) {
    setCategories(next.map((category, index) => ({ ...category, sort_order: index })))
    void Promise.all(
      next.map((category, index) =>
        category.sort_order === index
          ? Promise.resolve({ error: null })
          : supabase.from('categories').update({ sort_order: index }).eq('id', category.id),
      ),
    ).then((results) => {
      if (results.some((result) => result.error)) {
        setError('Não foi possível salvar a nova ordem. Recarregue a página.')
      }
    })
  }

  function handleToggleActive(category: CategoryWithCount, active: boolean) {
    setCategories((current) =>
      current
        ? current.map((item) => (item.id === category.id ? { ...item, is_active: active } : item))
        : current,
    )
    void supabase
      .from('categories')
      .update({ is_active: active })
      .eq('id', category.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          setError('Não foi possível atualizar a categoria. Recarregue a página.')
          void reload()
        }
      })
  }

  if (!restaurant) {
    return null
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Categorias</h2>
          <p className="text-muted-foreground text-sm">
            Arraste pelo ícone para definir a ordem exibida ao cliente.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus />
          Nova categoria
        </Button>
      </div>

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {categories === null ? (
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-[74px] animate-pulse rounded-xl" />
          <div className="bg-muted h-[74px] animate-pulse rounded-xl" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Nenhuma categoria ainda. Crie a primeira para começar a montar o cardápio.
        </div>
      ) : (
        <CategoryList
          categories={categories}
          onReorder={handleReorder}
          onToggleActive={handleToggleActive}
          onEdit={(category) => {
            setEditing(category)
            setFormOpen(true)
          }}
          onDelete={setDeleting}
        />
      )}

      {formOpen ? (
        <CategoryFormDialog
          restaurantId={restaurant.id}
          category={editing}
          nextSortOrder={categories?.length ?? 0}
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) {
              setEditing(null)
            }
          }}
          onSaved={() => void reload()}
        />
      ) : null}

      {deleting ? (
        <DeleteCategoryDialog
          category={deleting}
          open={deleting !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleting(null)
            }
          }}
          onDeleted={() => void reload()}
        />
      ) : null}
    </div>
  )
}
