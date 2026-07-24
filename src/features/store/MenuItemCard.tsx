import { useEffect, useState } from 'react'
import { Check, ImageIcon, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import type { MenuItem } from '@/features/menu/types'
import { useStore } from './store-context'

// Card de item da vitrine com seletor de quantidade (tarefa 3.3).
// Item indisponível continua visível, mas bloqueado para compra.
export function MenuItemCard({ item }: { item: MenuItem }) {
  const { restaurant } = useStore()
  const addItem = useCartStore((state) => state.addItem)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) {
      return
    }
    const timer = setTimeout(() => setAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [added])

  function handleAdd() {
    addItem(
      restaurant.id,
      { itemId: item.id, name: item.name, price: item.price, imageUrl: item.image_url },
      quantity,
    )
    setQuantity(1)
    setAdded(true)
  }

  return (
    <li
      className={cn(
        'bg-card flex gap-3 rounded-2xl border p-3 shadow-sm',
        !item.is_available && 'opacity-60',
      )}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          className="bg-muted size-24 shrink-0 rounded-xl border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-24 shrink-0 items-center justify-center rounded-xl border">
          <ImageIcon className="size-6" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-semibold">{item.name}</p>
        {item.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">{item.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="font-display text-primary font-bold">{formatBRL(item.price)}</span>

          {item.is_available ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label={`Diminuir quantidade de ${item.name}`}
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus />
                </Button>
                <span aria-live="polite" className="w-6 text-center text-sm font-semibold">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label={`Aumentar quantidade de ${item.name}`}
                  onClick={() => setQuantity((current) => current + 1)}
                >
                  <Plus />
                </Button>
              </div>
              <Button
                size="sm"
                className={cn('rounded-full', added && 'bg-success hover:bg-success')}
                aria-live="polite"
                onClick={handleAdd}
              >
                {added ? (
                  <>
                    <Check />
                    Adicionado
                  </>
                ) : (
                  'Adicionar'
                )}
              </Button>
            </div>
          ) : (
            <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">
              Indisponível no momento
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
