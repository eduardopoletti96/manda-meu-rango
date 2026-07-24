import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  updateQuantity: (restaurantId: string, itemId: string, quantity: number) => void
  removeItem: (restaurantId: string, itemId: string) => void
  setNotes: (restaurantId: string, notes: string) => void
  clear: (restaurantId: string) => void
}

export const EMPTY_CART: RestaurantCart = { items: [], notes: '' }

function withCart(
  carts: Record<string, RestaurantCart>,
  restaurantId: string,
  update: (cart: RestaurantCart) => RestaurantCart,
): { carts: Record<string, RestaurantCart> } {
  return { carts: { ...carts, [restaurantId]: update(carts[restaurantId] ?? EMPTY_CART) } }
}

// Persistido em localStorage (tarefa 3.4): o carrinho sobrevive ao refresh e
// o record por restaurante garante que trocar de loja não mistura os itens.
export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      carts: {},
      addItem: (restaurantId, item, quantity) =>
        set((state) =>
          withCart(state.carts, restaurantId, (cart) => {
            const existing = cart.items.find((entry) => entry.itemId === item.itemId)
            const items = existing
              ? cart.items.map((entry) =>
                  entry.itemId === item.itemId
                    ? { ...entry, quantity: entry.quantity + quantity }
                    : entry,
                )
              : [...cart.items, { ...item, quantity }]
            return { ...cart, items }
          }),
        ),
      updateQuantity: (restaurantId, itemId, quantity) =>
        set((state) =>
          withCart(state.carts, restaurantId, (cart) => ({
            ...cart,
            items: cart.items.map((entry) =>
              entry.itemId === itemId ? { ...entry, quantity: Math.max(1, quantity) } : entry,
            ),
          })),
        ),
      removeItem: (restaurantId, itemId) =>
        set((state) =>
          withCart(state.carts, restaurantId, (cart) => ({
            ...cart,
            items: cart.items.filter((entry) => entry.itemId !== itemId),
          })),
        ),
      setNotes: (restaurantId, notes) =>
        set((state) => withCart(state.carts, restaurantId, (cart) => ({ ...cart, notes }))),
      clear: (restaurantId) =>
        set((state) => {
          const carts = { ...state.carts }
          delete carts[restaurantId]
          return { carts }
        }),
    }),
    { name: 'mmr-cart', version: 1 },
  ),
)

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
