import { create } from 'zustand'

export type CartItem = {
  itemId: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

export type RestaurantCart = {
  items: CartItem[]
  /** Observação do pedido, preenchida na tela do carrinho (tarefa 3.5). */
  notes: string
}

// Carrinhos separados por restaurante: navegar em duas lojas não mistura
// os itens (decisão da tarefa 3.4, onde entra também a persistência).
type CartStore = {
  carts: Record<string, RestaurantCart>
  addItem: (restaurantId: string, item: Omit<CartItem, 'quantity'>, quantity: number) => void
}

export const EMPTY_CART: RestaurantCart = { items: [], notes: '' }

export const useCartStore = create<CartStore>()((set) => ({
  carts: {},
  addItem: (restaurantId, item, quantity) =>
    set((state) => {
      const cart = state.carts[restaurantId] ?? EMPTY_CART
      const existing = cart.items.find((entry) => entry.itemId === item.itemId)
      const items = existing
        ? cart.items.map((entry) =>
            entry.itemId === item.itemId
              ? { ...entry, quantity: entry.quantity + quantity }
              : entry,
          )
        : [...cart.items, { ...item, quantity }]
      return { carts: { ...state.carts, [restaurantId]: { ...cart, items } } }
    }),
}))

/** Carrinho do restaurante informado (objeto vazio estável quando não há). */
export function useCart(restaurantId: string): RestaurantCart {
  return useCartStore((state) => state.carts[restaurantId]) ?? EMPTY_CART
}

export function cartCount(cart: RestaurantCart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function cartSubtotal(cart: RestaurantCart): number {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
