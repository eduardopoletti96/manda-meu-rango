import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useStore } from '@/features/store/store-context'
import { cartCount, useCart } from '@/stores/cart-store'

// Ícone do carrinho no header da loja com contagem de itens (tarefa 3.4).
export function CartIndicator() {
  const { restaurant } = useStore()
  const cart = useCart(restaurant.id)
  const count = cartCount(cart)

  return (
    <Link
      to={`/${restaurant.slug}/carrinho`}
      aria-label={count === 1 ? 'Carrinho com 1 item' : `Carrinho com ${count} itens`}
      className="hover:bg-muted relative rounded-full p-2 transition-colors"
    >
      <ShoppingBag className="size-5" />
      {count > 0 ? (
        // key={count} reinicia a animação a cada mudança (microinteração do add).
        <span
          key={count}
          className="animate-in zoom-in bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-[11px] font-bold duration-300"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}
