import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CategoryGrid } from '@/features/store/CategoryGrid'
import { StoreHero } from '@/features/store/StoreHero'
import { useStore } from '@/features/store/store-context'
import type { Category } from '@/features/menu/types'

// Home da vitrine: capa, logo, informações e grid de categorias (tarefa 3.2).
// O filtro is_active é explícito porque, para um membro logado do restaurante,
// a RLS devolveria também as categorias inativas.
export function StoreHomePage() {
  const { restaurant } = useStore()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then((result) => {
        if (cancelled) {
          return
        }
        if (result.error) {
          setError('Não foi possível carregar o cardápio. Recarregue a página.')
          return
        }
        setCategories(result.data)
      })
    return () => {
      cancelled = true
    }
  }, [restaurant.id])

  return (
    <div className="flex flex-col gap-5">
      <StoreHero />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cardápio</h2>

        {error ? (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : categories === null ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted aspect-[4/3] animate-pulse rounded-2xl" />
            <div className="bg-muted aspect-[4/3] animate-pulse rounded-2xl" />
            <div className="bg-muted aspect-[4/3] animate-pulse rounded-2xl" />
            <div className="bg-muted aspect-[4/3] animate-pulse rounded-2xl" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
            O cardápio ainda está em construção. Volte em breve!
          </div>
        ) : (
          <CategoryGrid categories={categories} />
        )}
      </section>
    </div>
  )
}
