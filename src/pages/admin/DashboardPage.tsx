import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { formatBRL } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'

type TodayStats = {
  orders: number
  revenue: number
  avgTicket: number
}

function StatTile({
  label,
  value,
  hint,
  loading,
}: {
  label: string
  value: string
  hint: string
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        {loading ? (
          <div className="bg-muted h-8 w-24 animate-pulse rounded-md" />
        ) : (
          <p className="font-sans text-2xl font-semibold">{value}</p>
        )}
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}

// Resumo do dia (tarefa 2.3). Os números ganham vida na Fase 6, quando os
// pedidos passam a ser criados; até lá o dia começa zerado.
export function DashboardPage() {
  const { restaurant } = useRestaurant()
  const restaurantId = restaurant?.id
  const [stats, setStats] = useState<TodayStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!restaurantId) {
      return
    }
    let cancelled = false
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    void supabase
      .from('orders')
      .select('total, status, payment_status')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startOfDay.toISOString())
      .then(({ data, error: queryError }) => {
        if (cancelled) {
          return
        }
        if (queryError) {
          setError('Não foi possível carregar o resumo de hoje. Recarregue a página.')
          return
        }
        const active = data.filter((order) => order.status !== 'cancelled')
        const paid = active.filter((order) => order.payment_status === 'paid')
        const revenue = paid.reduce((sum, order) => sum + Number(order.total), 0)
        setStats({
          orders: active.length,
          revenue,
          avgTicket: paid.length > 0 ? revenue / paid.length : 0,
        })
      })
    return () => {
      cancelled = true
    }
  }, [restaurantId])

  const loading = stats === null && error === null

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Pedidos hoje"
          value={String(stats?.orders ?? 0)}
          hint="Recebidos desde 00:00, sem os cancelados"
          loading={loading}
        />
        <StatTile
          label="Faturamento hoje"
          value={formatBRL(stats?.revenue ?? 0)}
          hint="Soma dos pedidos pagos"
          loading={loading}
        />
        <StatTile
          label="Ticket médio"
          value={formatBRL(stats?.avgTicket ?? 0)}
          hint="Média por pedido pago"
          loading={loading}
        />
      </div>
    </div>
  )
}
