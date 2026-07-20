// ⚠️ PÁGINA TEMPORÁRIA DE DIAGNÓSTICO (rota /status).
// Serve para verificar, no navegador, que o front conversa com o Supabase e
// que a leitura pública (RLS) do restaurante de seed funciona de ponta a ponta.
// Remover quando a vitrine real (Fase 3) estiver pronta — a rota está
// registrada em src/app/router.tsx com um comentário apontando para cá.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Item = { name: string; price: number; is_available: boolean }
type Categoria = { id: string; name: string; itens: Item[] }

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function StatusPage() {
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando')
  const [erro, setErro] = useState<string | null>(null)
  const [restaurante, setRestaurante] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    async function carregar() {
      const { data: rest, error: restErro } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('slug', 'cantina-da-nona')
        .maybeSingle()

      if (restErro) return falhar(restErro.message)
      if (!rest) return falhar('Restaurante de seed não encontrado. Rode supabase/seed.sql no SQL Editor.')

      const { data: cats, error: catErro } = await supabase
        .from('categories')
        .select('id, name, menu_items ( name, price, is_available, sort_order )')
        .eq('restaurant_id', rest.id)
        .order('sort_order')

      if (catErro) return falhar(catErro.message)

      setRestaurante(rest.name)
      setCategorias(
        (cats ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          itens: [...(c.menu_items ?? [])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(({ name, price, is_available }) => ({ name, price, is_available })),
        })),
      )
      setEstado('ok')
    }

    function falhar(mensagem: string) {
      setErro(mensagem)
      setEstado('erro')
    }

    carregar()
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Diagnóstico temporário
        </span>
        <h1 className="text-2xl font-bold">Conexão com o Supabase</h1>
      </header>

      {estado === 'carregando' && <p className="text-muted-foreground">Consultando o banco…</p>}

      {estado === 'erro' && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-semibold text-destructive">Falha na leitura</p>
          <p className="text-muted-foreground mt-1 text-sm">{erro}</p>
        </div>
      )}

      {estado === 'ok' && (
        <>
          <div className="rounded-2xl border border-green-600/40 bg-green-600/5 p-4">
            <p className="font-semibold text-green-700">Conectado ✓</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Leitura pública funcionando. Restaurante de seed: <strong>{restaurante}</strong>.
            </p>
          </div>

          {categorias.map((cat) => (
            <section key={cat.id} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{cat.name}</h2>
              <ul className="flex flex-col gap-1">
                {cat.itens.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                  >
                    <span className={item.is_available ? '' : 'text-muted-foreground line-through'}>
                      {item.name}
                      {!item.is_available && ' (indisponível)'}
                    </span>
                    <span className="font-medium">{brl.format(item.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  )
}
