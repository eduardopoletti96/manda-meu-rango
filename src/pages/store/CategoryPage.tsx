import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { MenuItemCard } from '@/features/store/MenuItemCard'
import { useStore } from '@/features/store/store-context'
import type { Category, MenuItem } from '@/features/menu/types'

// Itens de uma categoria na vitrine (tarefa 3.3). O filtro is_active da
// categoria é explícito porque, para um membro logado do restaurante, a RLS
// devolveria também categorias inativas — que o cliente não vê.
export function CategoryPage() {
  const { categoriaId } = useParams<{ categoriaId: string }>()
  const { restaurant } = useStore()
  const [category, setCategory] = useState<Category | null | 'not-found'>(null)
  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categoriaId) {
      return
    }
    let cancelled = false
    void supabase
      .from('categories')
      .select('*')
      .eq('id', categoriaId)
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data, error: categoryError }) => {
        if (cancelled) {
          return
        }
        if (categoryError) {
          setError('Não foi possível carregar a categoria. Recarregue a página.')
          return
        }
        setCategory(data ?? 'not-found')
      })
    void supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoriaId)
      .order('sort_order')
      .order('created_at')
      .then((result) => {
        if (cancelled) {
          return
        }
        if (result.error) {
          setError('Não foi possível carregar os itens. Recarregue a página.')
          return
        }
        setItems(result.data)
      })
    return () => {
      cancelled = true
    }
  }, [restaurant.id, categoriaId])

  if (category === 'not-found') {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted-foreground text-sm">
          Esta categoria não existe ou não está mais disponível.
        </p>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link to={`/${restaurant.slug}`}>
            <ArrowLeft />
            Voltar ao cardápio
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar ao cardápio">
          <Link to={`/${restaurant.slug}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-bold">
          {category ? category.name : 'Carregando…'}
        </h1>
      </div>

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {items === null ? (
        <div className="flex flex-col gap-3">
          <div className="bg-muted h-[120px] animate-pulse rounded-2xl" />
          <div className="bg-muted h-[120px] animate-pulse rounded-2xl" />
          <div className="bg-muted h-[120px] animate-pulse rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
          Nenhum item nesta categoria ainda.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
