import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddressDialog } from './AddressDialog'
import {
  deleteAddress,
  formatAddress,
  listAddresses,
  setDefaultAddress,
  type CustomerAddress,
} from './address-api'

type AddressPickerProps = {
  token: string
  customerId: string
  selectedId: string | null
  onSelectedChange: Dispatch<SetStateAction<string | null>>
}

// 5.3 — Lista, seleção e manutenção dos endereços salvos.
// O endereço padrão já vem escolhido; se não houver padrão, cai no mais
// recente, para o cliente não precisar tocar em nada no caminho comum.
export function AddressPicker({
  token,
  customerId,
  selectedId,
  onSelectedChange,
}: AddressPickerProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerAddress | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Contador de recarga: mexer nele é como as ações (salvar, excluir, tornar
  // padrão) pedem uma nova leitura da lista.
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    void listAddresses(token).then((result) => {
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setError(result.error)
        setAddresses([])
        return
      }
      setError(null)
      setAddresses(result.data)
      // Mantém a seleção válida: escolhe o padrão na primeira carga e se
      // recupera quando o endereço selecionado deixa de existir.
      onSelectedChange((current) => {
        if (current && result.data.some((address) => address.id === current)) {
          return current
        }
        const preferred = result.data.find((address) => address.is_default) ?? result.data[0]
        return preferred?.id ?? null
      })
    })
    return () => {
      cancelled = true
    }
  }, [token, reloadCount, onSelectedChange])

  function reload() {
    setReloadCount((count) => count + 1)
  }

  async function handleDelete(addressId: string) {
    setBusy(true)
    const result = await deleteAddress(token, addressId)
    setBusy(false)
    setConfirmingDelete(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    reload()
  }

  async function handleSetDefault(addressId: string) {
    setBusy(true)
    const result = await setDefaultAddress(token, addressId)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    reload()
  }

  if (addresses === null) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <div className="bg-muted h-20 animate-pulse rounded-2xl" />
        <div className="bg-muted h-20 animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <div className="border-muted-foreground/30 flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
          <MapPin aria-hidden className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">
            Você ainda não tem endereços salvos. Cadastre um para receber o pedido em casa.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) => {
            const selected = address.id === selectedId
            return (
              <li key={address.id}>
                <div
                  className={`bg-card rounded-2xl border p-3 shadow-sm transition-colors ${
                    selected ? 'border-primary ring-primary/30 ring-2' : ''
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="delivery-address"
                      className="accent-primary mt-1 size-4"
                      checked={selected}
                      onChange={() => onSelectedChange(address.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{address.label || 'Endereço'}</span>
                        {address.is_default ? (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                            Padrão
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground block text-sm">
                        {formatAddress(address)}
                      </span>
                      {address.complement || address.reference ? (
                        <span className="text-muted-foreground block text-xs">
                          {[address.complement, address.reference].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </span>
                  </label>

                  <div className="mt-2 flex flex-wrap items-center gap-1 pl-7">
                    {!address.is_default ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleSetDefault(address.id)}
                      >
                        <Star />
                        Tornar padrão
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(address)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil />
                      Editar
                    </Button>
                    {confirmingDelete === address.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() => void handleDelete(address.id)}
                        >
                          Confirmar exclusão
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmingDelete(address.id)}
                      >
                        <Trash2 />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Button
        variant="outline"
        className="rounded-2xl"
        onClick={() => {
          setEditing(null)
          setDialogOpen(true)
        }}
      >
        <Plus />
        Novo endereço
      </Button>

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        token={token}
        customerId={customerId}
        address={editing}
        defaultToDefault={addresses.length === 0}
        onSaved={(saved) => {
          onSelectedChange(saved.id)
          reload()
        }}
      />
    </div>
  )
}
