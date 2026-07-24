import { Link } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import type { Category } from '@/features/menu/types'

// Grid de categorias em 2 colunas com quadros de título + imagem (tarefa 3.2).
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            to={`categoria/${category.id}`}
            className="group bg-card block overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md"
          >
            {category.image_url ? (
              <div className="bg-muted aspect-[4/3] overflow-hidden">
                <img
                  src={category.image_url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center">
                <UtensilsCrossed className="size-8" />
              </div>
            )}
            <p className="font-display truncate px-3 py-2.5 text-center font-semibold">
              {category.name}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
