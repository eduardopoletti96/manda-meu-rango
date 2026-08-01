import { useSyncExternalStore } from 'react'
import type { OrderStatus } from '@/features/orders/order-status'

// 6.3 — Timer do card, com o semáforo do documento base §6.4.
//
// Um relógio só para o quadro inteiro: dez cards não precisam de dez
// setInterval. Os assinantes entram e saem com os cards, e o intervalo só
// existe enquanto alguém estiver olhando.

const TICK_MS = 1000

let now = Date.now()
let interval: number | undefined
const subscribers = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange)
  if (interval === undefined) {
    interval = window.setInterval(() => {
      now = Date.now()
      for (const notify of subscribers) {
        notify()
      }
    }, TICK_MS)
  }
  return () => {
    subscribers.delete(onChange)
    if (subscribers.size === 0 && interval !== undefined) {
      window.clearInterval(interval)
      interval = undefined
    }
  }
}

function getSnapshot(): number {
  return now
}

/** Relógio compartilhado, atualizado de segundo em segundo. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Faltando mais que isto para a previsão, o card está tranquilo. */
export const WARNING_WINDOW_MS = 10 * 60 * 1000

export type TimerLevel = 'green' | 'orange' | 'red' | 'stopped'

export type OrderTimer = {
  /** Tempo decorrido desde a criação; congelado quando o pedido parou. */
  elapsedMs: number
  level: TimerLevel
  /** Falta (positivo) ou passou (negativo) da previsão, em ms. Null sem previsão. */
  remainingMs: number | null
  running: boolean
}

export type TimedOrder = {
  status: OrderStatus
  created_at: string
  estimated_ready_at: string | null
  ready_at: string | null
  finished_at: string | null
}

/** Instante em que o relógio parou, ou null se ainda está correndo. */
function stoppedAt(order: TimedOrder): number | null {
  if (order.status === 'finished' && order.finished_at) {
    return new Date(order.finished_at).getTime()
  }
  if (order.status === 'ready' && order.ready_at) {
    return new Date(order.ready_at).getTime()
  }
  // Status parado sem carimbo (pedido anterior à migration): congela na
  // previsão, que é melhor do que deixar o relógio correr para sempre.
  if (order.status === 'ready' || order.status === 'finished') {
    return order.estimated_ready_at ? new Date(order.estimated_ready_at).getTime() : null
  }
  return null
}

/**
 * Semáforo e tempo decorrido de um pedido.
 *
 * O relógio para em `ready` e em `finished` — nesses dois o pedido saiu das
 * mãos da cozinha e cobrar atraso não ajuda mais ninguém, então também não
 * fica vermelho (regra literal do §6.4). Nos demais, verde até faltarem 10
 * minutos para a previsão, laranja dentro dessa janela e vermelho depois dela.
 */
export function useOrderTimer(order: TimedOrder): OrderTimer {
  const clock = useNow()
  const stopped = stoppedAt(order)
  const reference = stopped ?? clock
  const elapsedMs = Math.max(0, reference - new Date(order.created_at).getTime())
  const remainingMs = order.estimated_ready_at
    ? new Date(order.estimated_ready_at).getTime() - reference
    : null

  let level: TimerLevel
  if (order.status === 'ready' || order.status === 'finished') {
    level = 'stopped'
  } else if (remainingMs === null || remainingMs > WARNING_WINDOW_MS) {
    level = 'green'
  } else if (remainingMs > 0) {
    level = 'orange'
  } else {
    level = 'red'
  }

  return { elapsedMs, level, remainingMs, running: stopped === null }
}

/** "7:05" até uma hora; "1h07" depois disso. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}h${String(minutes).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}
