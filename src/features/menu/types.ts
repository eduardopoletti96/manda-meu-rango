import type { Database } from '@/types/database'

export type Category = Database['public']['Tables']['categories']['Row']

// Linha da listagem do painel: categoria + contagem agregada de itens.
export type CategoryWithCount = Category & { menu_items: { count: number }[] }

export function categoryItemCount(category: CategoryWithCount): number {
  return category.menu_items[0]?.count ?? 0
}
