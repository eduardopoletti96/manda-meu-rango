import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { ItemFormDialog } from '@/features/menu/ItemFormDialog'
import { DeleteItemDialog } from '@/features/menu/DeleteItemDialog'
import { ItemList } from '@/features/menu/ItemList'
import type { Category, MenuItem } from '@/features/menu/types'
import { Button } from '@/components/ui/button'

function fetchItems(categoryId: string) {
  return supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order')
    .order('created_at')
}

// Itens de uma categoria (tarefa 2.6): CRUD, disponibilidade e ordenação.
export function CategoryItemsAdminPage() {
  const { categoriaId } = useParams<{ categoriaId: string }>()
  const { restaurant } = useRestaurant()
  const restaurantId = restaurant?.id
  const [category, setCategory] = useState<Category | null | 'not-found'>(null)
  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [deleting, setDeleting] = useState<MenuItem | null>(null)

  const applyItems = useCallback((result: Awaited<ReturnType<typeof fetchItems>>) => {
    if (result.error) {
      setError('Não foi possível carregar os itens. Recarregue a página.')
      return
    }
    setError(null)
    setItems(result.data)
  }, [])

  useEffect(() => {
    if (!restaurantId || !categoriaId) {
      return
    }
    let cancelled = false
    void supabase
      .from('categories')
      .select('*')
      .eq('id', categoriaId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
      .then(({ data, error: categoryError }) => {
        if (cancelled) {
          return
        }
        if (categoryError || !data) {
          setCategory('not-found')
          return
        }
        setCategory(data)
      })
    void fetchItems(categoriaId).then((result) => {
      if (!cancelled) {
        applyItems(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [restaurantId, categoriaId, applyItems])

  const reload = useCallback(async () => {
    if (categoriaId) {
      applyItems(await fetchItems(categoriaId))
    }
  }, [categoriaId, applyItems])

  function handleReorder(next: MenuItem[]) {
    setItems(next.map((item, index) => ({ ...item, sort_order: index })))
    void Promise.all(
      next.map((item, index) =>
        item.sort_order === index
          ? Promise.resolve({ error: null })
          : supabase.from('menu_items').update({ sort_order: index }).eq('id', item.id),
      ),
    ).then((results) => {
      if (results.some((result) => result.error)) {
        setError('Não foi possível salvar a nova ordem. Recarregue a página.')
      }
    })
  }

  function handleToggleAvailable(item: MenuItem, available: boolean) {
    setItems((current) =>
      current
        ? current.map((entry) =>
            entry.id === item.id ? { ...entry, is_available: available } : entry,
          )
        : current,
    )
    void supabase
      .from('menu_items')
      .update({ is_available: available })
      .eq('id', item.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          setError('Não foi possível atualizar o item. Recarregue a página.')
          void reload()
        }
      })
  }

  if (!restaurant || !categoriaId) {
    return null
  }

  if (category === 'not-found') {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted-foreground text-sm">Categoria não encontrada.</p>
        <Button asChild variant="outline">
          <Link to="/admin/cardapio">
            <ArrowLeft />
            Voltar às categorias
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar às categorias">
            <Link to="/admin/cardapio">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">
              {category ? category.name : 'Carregando…'}
            </h2>
            <p className="text-muted-foreground text-sm">
              Arraste pelo ícone para definir a ordem dos itens.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus />
          Novo item
        </Button>
      </div>

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {items === null ? (
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-[74px] animate-pulse rounded-xl" />
          <div className="bg-muted h-[74px] animate-pulse rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Nenhum item nesta categoria ainda. Adicione o primeiro.
        </div>
      ) : (
        <ItemList
          items={items}
          onReorder={handleReorder}
          onToggleAvailable={handleToggleAvailable}
          onEdit={(item) => {
            setEditing(item)
            setFormOpen(true)
          }}
          onDelete={setDeleting}
        />
      )}

      {formOpen ? (
        <ItemFormDialog
          restaurantId={restaurant.id}
          categoryId={categoriaId}
          item={editing}
          nextSortOrder={items?.length ?? 0}
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
        <DeleteItemDialog
          item={deleting}
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
