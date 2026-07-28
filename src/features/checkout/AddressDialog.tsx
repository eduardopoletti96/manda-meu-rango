import { useState, type FormEvent } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  createAddress,
  updateAddress,
  type AddressInput,
  type CustomerAddress,
} from './address-api'
import { isValidCep, lookupCep, maskCep } from './cep'

type FormState = {
  zipCode: string
  street: string
  district: string
  city: string
  state: string
  number: string
  complement: string
  reference: string
  label: string
}

const EMPTY_FORM: FormState = {
  zipCode: '',
  street: '',
  district: '',
  city: '',
  state: '',
  number: '',
  complement: '',
  reference: '',
  label: '',
}

function toForm(address: CustomerAddress): FormState {
  return {
    zipCode: maskCep(address.zip_code ?? ''),
    street: address.street ?? '',
    district: address.district ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    number: address.number ?? '',
    complement: address.complement ?? '',
    reference: address.reference ?? '',
    label: address.label ?? '',
  }
}

function toInput(form: FormState): AddressInput {
  return {
    label: form.label,
    zipCode: form.zipCode.replace(/\D/g, ''),
    street: form.street,
    district: form.district,
    city: form.city,
    state: form.state,
    number: form.number,
    complement: form.complement,
    reference: form.reference,
  }
}

type AddressDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  customerId: string
  /** Endereço em edição; ausente cria um novo. */
  address?: CustomerAddress | null
  /** Marca o novo endereço como padrão (usado quando é o primeiro do cliente). */
  defaultToDefault?: boolean
  onSaved: (address: CustomerAddress) => void
}

// 5.2 — Cadastro de endereço com busca por CEP.
//
// O formulário vive num componente à parte, montado só com o modal aberto e
// com key por endereço: fechar e reabrir devolve um formulário limpo sem
// precisar de efeito de reset.
export function AddressDialog({ open, onOpenChange, ...formProps }: AddressDialogProps) {
  const editing = formProps.address ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar endereço' : 'Novo endereço'}</DialogTitle>
          <DialogDescription>Comece pelo CEP — preenchemos o resto para você.</DialogDescription>
        </DialogHeader>
        <AddressForm
          key={editing?.id ?? 'new'}
          {...formProps}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type AddressFormProps = Omit<AddressDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void }

// O CEP preenche logradouro, bairro, cidade e UF e trava esses campos (§6.3 do
// documento base); "editar manualmente" destrava. Quando a consulta não acha o
// CEP ou os provedores estão fora, o formulário fica destravado — a busca é
// conveniência, não pré-requisito.
function AddressForm({
  token,
  customerId,
  address,
  defaultToDefault = false,
  onSaved,
  onClose,
}: AddressFormProps) {
  const editing = address ?? null
  const [form, setForm] = useState<FormState>(() => (editing ? toForm(editing) : EMPTY_FORM))
  const [locked, setLocked] = useState(false)
  const [makeDefault, setMakeDefault] = useState(editing ? editing.is_default : defaultToDefault)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cepMessage, setCepMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleLookup(rawCep: string) {
    setSearching(true)
    setCepMessage(null)
    const result = await lookupCep(rawCep)
    setSearching(false)

    if (result.ok) {
      setForm((current) => ({
        ...current,
        street: result.address.street,
        district: result.address.district,
        city: result.address.city,
        state: result.address.state,
      }))
      setLocked(true)
      setCepMessage(null)
      return
    }

    setLocked(false)
    setCepMessage(
      result.reason === 'not-found'
        ? 'CEP não encontrado. Preencha o endereço manualmente.'
        : result.reason === 'invalid'
          ? 'CEP incompleto: são 8 dígitos.'
          : 'Não conseguimos consultar o CEP agora. Preencha manualmente.',
    )
  }

  function handleCepChange(value: string) {
    const masked = maskCep(value)
    update('zipCode', masked)
    setCepMessage(null)
    // Busca sozinha ao completar os 8 dígitos; o botão fica para retentar.
    if (isValidCep(masked)) {
      void handleLookup(masked)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (form.zipCode.length > 0 && !isValidCep(form.zipCode)) {
      setError('O CEP precisa ter 8 dígitos (ou pode ficar em branco).')
      return
    }
    if (form.street.trim().length === 0) {
      setError('Informe a rua.')
      return
    }
    if (form.number.trim().length === 0) {
      setError('Informe o número.')
      return
    }
    if (form.city.trim().length === 0) {
      setError('Informe a cidade.')
      return
    }
    if (!/^[A-Za-z]{2}$/.test(form.state.trim())) {
      setError('Informe a UF com 2 letras (ex.: RS).')
      return
    }

    setSaving(true)
    const result = editing
      ? await updateAddress(token, editing.id, toInput(form))
      : await createAddress(token, customerId, toInput(form), makeDefault)
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved(result.data)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="address-cep">CEP</Label>
        <div className="flex gap-2">
          <Input
            id="address-cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="90000-000"
            value={form.zipCode}
            onChange={(event) => handleCepChange(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Buscar CEP"
            disabled={searching || !isValidCep(form.zipCode)}
            onClick={() => void handleLookup(form.zipCode)}
          >
            {searching ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>
        {cepMessage ? (
          <p className="bg-warning/15 rounded-md px-3 py-2 text-xs">{cepMessage}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="address-street">Rua</Label>
          {locked ? (
            <button
              type="button"
              className="text-primary text-xs font-medium hover:underline"
              onClick={() => setLocked(false)}
            >
              Editar manualmente
            </button>
          ) : null}
        </div>
        <Input
          id="address-street"
          autoComplete="address-line1"
          readOnly={locked}
          className={locked ? 'bg-muted' : undefined}
          value={form.street}
          onChange={(event) => update('street', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-number">Número</Label>
          <Input
            id="address-number"
            inputMode="numeric"
            required
            value={form.number}
            onChange={(event) => update('number', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-complement">Complemento</Label>
          <Input
            id="address-complement"
            placeholder="Apto 302"
            value={form.complement}
            onChange={(event) => update('complement', event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address-district">Bairro</Label>
        <Input
          id="address-district"
          readOnly={locked}
          className={locked ? 'bg-muted' : undefined}
          value={form.district}
          onChange={(event) => update('district', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-city">Cidade</Label>
          <Input
            id="address-city"
            readOnly={locked}
            className={locked ? 'bg-muted' : undefined}
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-state">UF</Label>
          <Input
            id="address-state"
            maxLength={2}
            readOnly={locked}
            className={locked ? 'bg-muted uppercase' : 'uppercase'}
            value={form.state}
            onChange={(event) => update('state', event.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address-reference">Ponto de referência</Label>
        <Input
          id="address-reference"
          placeholder="Portão verde, ao lado da padaria"
          value={form.reference}
          onChange={(event) => update('reference', event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address-label">Apelido do endereço</Label>
        <Input
          id="address-label"
          placeholder="Casa, Trabalho…"
          value={form.label}
          onChange={(event) => update('label', event.target.value)}
        />
      </div>

      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="address-default" className="font-normal">
            Usar como endereço padrão
          </Label>
          <Switch id="address-default" checked={makeDefault} onCheckedChange={setMakeDefault} />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" className="rounded-2xl" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="rounded-2xl" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar endereço'}
        </Button>
      </DialogFooter>
    </form>
  )
}
