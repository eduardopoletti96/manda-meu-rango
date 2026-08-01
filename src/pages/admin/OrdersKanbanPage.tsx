import { useCallback, useEffect, useState } from 'react'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { fetchKanbanOrders } from '@/features/orders/orders-api'
import { KANBAN_COLUMNS, isKanbanStatus, type KanbanStatus } from '@/features/orders/order-status'
import { OrderColumn } from '@/features/orders/OrderColumn'
import { OrderCard } from '@/features/orders/OrderCard'
import { OrderDetailDialog } from '@/features/orders/OrderDetailDialog'
import type { KanbanOrder } from '@/features/orders/types'

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

// 6.1 — Kanban de pedidos: as cinco colunas do documento base §6.4 com os
// pedidos do dia (mais os que continuam em aberto de ontem) e o contador de
// cada coluna.
export function OrdersKanbanPage() {
  const { restaurant } = useRestaurant()
  const restaurantId = restaurant?.id
  const [orders, setOrders] = useState<KanbanOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)

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

  if (!restaurant) {
    return null
  }

  const board = orders ? groupByStatus(orders) : emptyBoard()
  const openOrder = orders?.find((order) => order.id === openOrderId) ?? null
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
      </div>

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {orders === null ? (
        <BoardSkeleton />
      ) : (
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((status) => (
            <OrderColumn
              key={status}
              status={status}
              count={board[status].length}
              isEmpty={board[status].length === 0}
            >
              {board[status].map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onOpen={() => setOpenOrderId(order.id)}
                />
              ))}
            </OrderColumn>
          ))}
        </div>
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
        />
      ) : null}
    </div>
  )
}
