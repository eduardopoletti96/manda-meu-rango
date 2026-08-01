import { useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type OrdersChange = {
  orderId: string
  event: 'INSERT' | 'UPDATE' | 'DELETE'
}

export type RealtimeState = 'connecting' | 'live' | 'off'

/**
 * 6.5 — Assina as mudanças de `orders` do restaurante.
 *
 * O payload do Realtime traz só a linha de `orders` — sem cliente e sem itens.
 * Em vez de montar um card pela metade, avisamos *qual* pedido mudou e quem
 * chamou relê aquele pedido no formato do quadro. Uma ida a mais à rede por
 * evento, em troca de um card sempre completo.
 *
 * O handler fica numa ref porque o canal não pode ser recriado a cada render:
 * cada `subscribe` é uma conexão nova e um punhado de eventos perdidos no meio.
 */
export function useOrdersRealtime(
  restaurantId: string | undefined,
  onChange: (change: OrdersChange) => void,
): RealtimeState {
  const handler = useRef(onChange)
  const [state, setState] = useState<RealtimeState>('connecting')

  useEffect(() => {
    handler.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!restaurantId) {
      return
    }

    const channel = supabase
      .channel(`orders-kanban-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
          const orderId =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id
          if (orderId) {
            handler.current({ orderId, event: payload.eventType })
          }
        },
      )
      .subscribe((status) => {
        setState(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' ? 'connecting' : 'off')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [restaurantId])

  return state
}
