import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { fetchKanbanOrders, fetchOrderById, updateOrderStatus } from '@/features/orders/orders-api'
import {
  KANBAN_COLUMNS,
  canMoveTo,
  isKanbanStatus,
  rejectionReason,
  type KanbanStatus,
  type OrderStatus,
} from '@/features/orders/order-status'
import { OrderColumn } from '@/features/orders/OrderColumn'
import { OrderCard } from '@/features/orders/OrderCard'
import { DraggableOrderCard } from '@/features/orders/DraggableOrderCard'
import { OrderDetailDialog } from '@/features/orders/OrderDetailDialog'
import { OrderStatusActions } from '@/features/orders/OrderStatusActions'
import { useOrdersRealtime, type OrdersChange } from '@/features/orders/useOrdersRealtime'
import { isChimeEnabled, playNewOrderChime, setChimeEnabled } from '@/features/orders/new-order-chime'
import type { KanbanOrder } from '@/features/orders/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Board = Record<KanbanStatus, KanbanOrder[]>

function emptyBoard(): Board {
  return { placed: [], in_production: [], ready: [], out_for_delivery: [], finished: [] }
}

function groupByStatus(orders: KanbanOrder[]): Board {
  const board = emptyBoard()
  for (const order of orders) {
    if (isKanbanStatus(order.status)) {
      board[order.status].push(order)
    }
  }
  return board
}

/**
 * A coluna que recebe o card é aquela onde o ponteiro está — e não a que o
 * retângulo do card mais cobre. Com colunas largas e cards largos, a segunda
 * regra faz o pedido cair na coluna vizinha à que o operador estava olhando.
 * `closestCorners` fica de reserva para o arrasto por teclado, que não tem
 * ponteiro para consultar.
 */
const collisionDetection: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args)
  return byPointer.length > 0 ? byPointer : closestCorners(args)
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((status) => (
        <div key={status} className="bg-muted/50 flex w-72 shrink-0 flex-col gap-2 rounded-2xl p-3">
          <div className="bg-muted h-5 w-32 animate-pulse rounded" />
          <div className="bg-muted h-20 animate-pulse rounded-xl" />
          <div className="bg-muted h-20 animate-pulse rounded-xl" />
        </div>
      ))}
    </div>
  )
}

// 6.1 a 6.4 — Kanban de pedidos: as cinco colunas do documento base §6.4 com
// os pedidos do dia (mais os que continuam em aberto de ontem), contador por
// coluna e movimentação por arrasto com atualização otimista.
export function OrdersKanbanPage() {
  const { restaurant } = useRestaurant()
  const restaurantId = restaurant?.id
  const [orders, setOrders] = useState<KanbanOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [arrivedIds, setArrivedIds] = useState<string[]>([])
  const [soundOn, setSoundOn] = useState(isChimeEnabled)
  // Espelho dos ids já conhecidos: o evento do Realtime chega antes de o
  // estado novo existir, e é este conjunto que diz se o pedido é inédito.
  const knownIds = useRef(new Set<string>())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchKanbanOrders>>) => {
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setOrders(result.data)
  }, [])

  useEffect(() => {
    if (!restaurantId) {
      return
    }
    let cancelled = false
    void fetchKanbanOrders(restaurantId).then((result) => {
      if (!cancelled) {
        apply(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [restaurantId, apply])

  useEffect(() => {
    if (orders) {
      knownIds.current = new Set(orders.map((order) => order.id))
    }
  }, [orders])

  /**
   * 6.5 — Um pedido mudou em algum lugar (outro operador, ou o webhook do
   * Stripe confirmando o pagamento). Relemos aquele pedido: o payload do
   * Realtime não traz cliente nem itens.
   */
  const handleRealtimeChange = useCallback(
    ({ orderId, event }: OrdersChange) => {
      if (!restaurantId) {
        return
      }
      if (event === 'DELETE') {
        knownIds.current.delete(orderId)
        setOrders((current) => current?.filter((order) => order.id !== orderId) ?? current)
        return
      }

      const inedito = !knownIds.current.has(orderId)
      knownIds.current.add(orderId)

      void fetchOrderById(restaurantId, orderId).then((fresh) => {
        // Pedido recém-criado ainda está em pending_payment: só entra no quadro
        // quando o pagamento for confirmado — que é outro evento, este mesmo.
        if (!fresh || fresh.status === 'pending_payment') {
          knownIds.current.delete(orderId)
          return
        }
        setOrders((current) => {
          if (!current) {
            return current
          }
          if (current.some((order) => order.id === fresh.id)) {
            return current.map((order) => (order.id === fresh.id ? fresh : order))
          }
          return [...current, fresh].sort((a, b) => a.created_at.localeCompare(b.created_at))
        })

        if (inedito && fresh.status === 'placed') {
          playNewOrderChime()
          setArrivedIds((current) => [...current, fresh.id])
        }
      })
    },
    [restaurantId],
  )

  const realtimeState = useOrdersRealtime(restaurantId, handleRealtimeChange)

  // O destaque some sozinho: ele marca "chegou agora", não "não foi visto".
  useEffect(() => {
    if (arrivedIds.length === 0) {
      return
    }
    const timer = window.setTimeout(() => setArrivedIds([]), 30_000)
    return () => window.clearTimeout(timer)
  }, [arrivedIds])

  const replaceOrder = useCallback((id: string, patch: Partial<KanbanOrder>) => {
    setOrders((current) =>
      current ? current.map((order) => (order.id === id ? { ...order, ...patch } : order)) : current,
    )
  }, [])

  /**
   * Move o pedido de coluna. A tela muda antes da resposta do servidor — quem
   * opera não pode esperar a rede a cada pedido —, e volta atrás se o update
   * falhar. A trigger do banco é a validação final: o `canMoveTo` daqui evita
   * a viagem, não substitui a regra.
   */
  const move = useCallback(
    async (order: KanbanOrder, status: OrderStatus) => {
      if (order.status === status) {
        return
      }
      if (status !== 'cancelled' && !canMoveTo(order.status, status, order.fulfillment_type)) {
        setMoveError(rejectionReason(order.status, status, order.fulfillment_type))
        return
      }

      const previous = order.status
      setMoveError(null)
      setMovingId(order.id)
      replaceOrder(order.id, { status })

      const result = await updateOrderStatus(order.id, status)
      setMovingId(null)

      if (!result.ok) {
        replaceOrder(order.id, { status: previous })
        setMoveError(result.error)
        return
      }

      // Relê o pedido: ready_at e finished_at são carimbados pela trigger, e
      // sem eles o timer continuaria correndo num pedido que já parou.
      if (restaurantId) {
        const fresh = await fetchOrderById(restaurantId, order.id)
        if (fresh) {
          replaceOrder(order.id, fresh)
        }
      }
    },
    [replaceOrder, restaurantId],
  )

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)
    const { active, over } = event
    if (!over) {
      return
    }
    const order = orders?.find((entry) => entry.id === active.id)
    const target = over.id as KanbanStatus
    if (order && isKanbanStatus(target)) {
      void move(order, target)
    }
  }

  if (!restaurant) {
    return null
  }

  const board = orders ? groupByStatus(orders) : emptyBoard()
  const openOrder = orders?.find((order) => order.id === openOrderId) ?? null
  const draggingOrder = orders?.find((order) => order.id === draggingId) ?? null
  const cancelled = orders?.filter((order) => order.status === 'cancelled').length ?? 0
  const inOperation = KANBAN_COLUMNS.filter((status) => status !== 'finished').reduce(
    (sum, status) => sum + board[status].length,
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Pedidos de hoje</h2>
          <p className="text-muted-foreground text-sm">
            {orders === null
              ? 'Carregando…'
              : `${inOperation} ${inOperation === 1 ? 'pedido em andamento' : 'pedidos em andamento'}` +
                (cancelled > 0
                  ? ` · ${cancelled} ${cancelled === 1 ? 'cancelado' : 'cancelados'}`
                  : '')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-muted-foreground flex items-center gap-1.5 text-xs"
            title={
              realtimeState === 'live'
                ? 'Novos pedidos e mudanças de outros operadores aparecem sozinhos.'
                : 'Sem conexão em tempo real — recarregue a página para ver mudanças.'
            }
          >
            <span
              aria-hidden
              className={cn(
                'size-2 rounded-full',
                realtimeState === 'live' ? 'bg-success' : 'bg-muted-foreground animate-pulse',
              )}
            />
            {realtimeState === 'live' ? 'Tempo real' : 'Reconectando…'}
          </span>
          <Button
            variant="outline"
            size="sm"
            aria-pressed={soundOn}
            onClick={() => {
              const next = !soundOn
              setChimeEnabled(next)
              setSoundOn(next)
              if (next) {
                playNewOrderChime()
              }
            }}
          >
            {soundOn ? <Bell /> : <BellOff />}
            {soundOn ? 'Som ligado' : 'Som desligado'}
          </Button>
        </div>
      </div>

      {arrivedIds.length > 0 ? (
        <p role="status" className="bg-primary/10 text-foreground rounded-md px-3 py-2 text-sm">
          <strong>
            {arrivedIds.length === 1 ? 'Pedido novo' : `${arrivedIds.length} pedidos novos`}
          </strong>{' '}
          {arrivedIds.length === 1 ? 'acabou de chegar' : 'acabaram de chegar'} — veja em "Pedido
          realizado".
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {moveError ? (
        <p
          role="alert"
          className="bg-warning/15 flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm"
        >
          {moveError}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline"
            onClick={() => setMoveError(null)}
          >
            Fechar
          </button>
        </p>
      ) : null}

      {orders === null ? (
        <BoardSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <div className="flex items-stretch gap-4 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((status) => (
              <OrderColumn
                key={status}
                status={status}
                count={board[status].length}
                isEmpty={board[status].length === 0}
              >
                {board[status].map((order) => (
                  <DraggableOrderCard
                    key={order.id}
                    order={order}
                    onOpen={() => setOpenOrderId(order.id)}
                    highlighted={arrivedIds.includes(order.id)}
                  />
                ))}
              </OrderColumn>
            ))}
          </div>

          <DragOverlay>
            {draggingOrder ? (
              <div className="w-72">
                <OrderCard order={draggingOrder} onOpen={() => {}} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {openOrder ? (
        <OrderDetailDialog
          order={openOrder}
          open
          onOpenChange={(next) => {
            if (!next) {
              setOpenOrderId(null)
            }
          }}
          actions={
            <OrderStatusActions
              order={openOrder}
              busy={movingId === openOrder.id}
              onMove={(order, status) => {
                void move(order, status).then(() => setOpenOrderId(null))
              }}
            />
          }
        />
      ) : null}
    </div>
  )
}
