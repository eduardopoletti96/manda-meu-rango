import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImageIcon, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/features/store/store-context'
import { formatBRL } from '@/lib/format'
import { cartSubtotal, useCart, useCartStore, type CartItem } from '@/stores/cart-store'

function CartRow({ restaurantId, item }: { restaurantId: string; item: CartItem }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)

  return (
    <li className="bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-sm">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="bg-muted size-16 shrink-0 rounded-xl border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-xl border">
          <ImageIcon className="size-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.name}</p>
        <p className="text-muted-foreground text-sm">
          {formatBRL(item.price)}
          {item.quantity > 1 ? ` · ${item.quantity}x = ${formatBRL(item.price * item.quantity)}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center rounded-full border">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label={`Diminuir quantidade de ${item.name}`}
            disabled={item.quantity <= 1}
            onClick={() => updateQuantity(restaurantId, item.itemId, item.quantity - 1)}
          >
            <Minus />
          </Button>
          <span aria-live="polite" className="w-6 text-center text-sm font-semibold">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label={`Aumentar quantidade de ${item.name}`}
            onClick={() => updateQuantity(restaurantId, item.itemId, item.quantity + 1)}
          >
            <Plus />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${item.name} do carrinho`}
          className="text-destructive hover:text-destructive"
          onClick={() => removeItem(restaurantId, item.itemId)}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

// Tela do carrinho (tarefa 3.5): ajuste de quantidades, remoção, observação,
// total e finalizar. O total aqui é o subtotal dos itens — taxa de entrega
// entra no checkout, quando o cliente escolhe a modalidade (Fase 5).
export function CartPage() {
  const { restaurant } = useStore()
  const navigate = useNavigate()
  const cart = useCart(restaurant.id)
  const setNotes = useCartStore((state) => state.setNotes)
  const clear = useCartStore((state) => state.clear)
  const subtotal = cartSubtotal(cart)

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShoppingBag aria-hidden className="text-muted-foreground size-12" />
        <div>
          <h1 className="text-xl font-bold">Seu carrinho está vazio</h1>
          <p className="text-muted-foreground text-sm">
            Que tal dar uma olhada no cardápio e escolher algo gostoso?
          </p>
        </div>
        <Button asChild className="rounded-2xl">
          <Link to={`/${restaurant.slug}`}>Ver cardápio</Link>
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
        <h1 className="text-xl font-bold">Carrinho</h1>
      </div>

      <ul className="flex flex-col gap-3">
        {cart.items.map((item) => (
          <CartRow key={item.itemId} restaurantId={restaurant.id} item={item} />
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cart-notes">Alguma observação?</Label>
        <Textarea
          id="cart-notes"
          placeholder="Ex.: tirar a cebola, caprichar no molho…"
          value={cart.notes}
          onChange={(event) => setNotes(restaurant.id, event.target.value)}
        />
      </div>

      <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span aria-live="polite" className="font-display text-xl font-bold">
            {formatBRL(subtotal)}
          </span>
        </div>
        {restaurant.delivery_enabled && restaurant.delivery_fee > 0 ? (
          <p className="text-muted-foreground text-xs">
            Escolhendo entrega, soma-se a taxa de {formatBRL(restaurant.delivery_fee)} no checkout.
          </p>
        ) : null}
        {restaurant.min_order_value > 0 && subtotal < restaurant.min_order_value ? (
          <p className="bg-warning/15 rounded-md px-3 py-2 text-xs">
            O pedido mínimo deste restaurante é {formatBRL(restaurant.min_order_value)}.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="rounded-2xl sm:flex-1"
            onClick={() => void navigate(`/${restaurant.slug}/checkout`)}
          >
            Finalizar pedido
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive rounded-2xl"
            onClick={() => clear(restaurant.id)}
          >
            <Trash2 />
            Limpar carrinho
          </Button>
        </div>
      </div>
    </div>
  )
}
