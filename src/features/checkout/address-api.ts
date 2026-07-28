import { customerSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

// 5.2 / 5.3 — CRUD dos endereços do cliente.
//
// Vai direto ao PostgREST com o JWT do cliente: a policy
// customer_addresses_all_self só devolve (e só aceita) linhas cujo customer_id
// bate com o claim do token, então não precisamos filtrar por cliente aqui —
// nem conseguiríamos burlar isso mandando outro id.

export type CustomerAddress = Database['public']['Tables']['customer_addresses']['Row']

export type AddressInput = {
  label: string | null
  zipCode: string | null
  street: string | null
  district: string | null
  city: string | null
  state: string | null
  number: string | null
  complement: string | null
  reference: string | null
}

export type AddressResult<T> = { ok: true; data: T } | { ok: false; error: string }

function failure(message: string, error: unknown): { ok: false; error: string } {
  console.error(`[address-api] ${message}`, error)
  return { ok: false, error: message }
}

export async function listAddresses(token: string): Promise<AddressResult<CustomerAddress[]>> {
  const { data, error } = await customerSupabase(token)
    .from('customer_addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return failure('Não foi possível carregar seus endereços.', error)
  }
  return { ok: true, data: data ?? [] }
}

/** Colunas do banco a partir do formulário; strings vazias viram null. */
function toRow(input: AddressInput) {
  const clean = (value: string | null) => {
    const trimmed = (value ?? '').trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return {
    label: clean(input.label),
    zip_code: clean(input.zipCode),
    street: clean(input.street),
    district: clean(input.district),
    city: clean(input.city),
    state: clean(input.state)?.toUpperCase() ?? null,
    number: clean(input.number),
    complement: clean(input.complement),
    reference: clean(input.reference),
  }
}

export async function createAddress(
  token: string,
  customerId: string,
  input: AddressInput,
  makeDefault: boolean,
): Promise<AddressResult<CustomerAddress>> {
  const client = customerSupabase(token)

  if (makeDefault) {
    const cleared = await clearDefault(token)
    if (!cleared.ok) {
      return cleared
    }
  }

  const { data, error } = await client
    .from('customer_addresses')
    .insert({ ...toRow(input), customer_id: customerId, is_default: makeDefault })
    .select('*')
    .single()

  if (error) {
    return failure('Não foi possível salvar o endereço.', error)
  }
  return { ok: true, data }
}

export async function updateAddress(
  token: string,
  addressId: string,
  input: AddressInput,
): Promise<AddressResult<CustomerAddress>> {
  const { data, error } = await customerSupabase(token)
    .from('customer_addresses')
    .update(toRow(input))
    .eq('id', addressId)
    .select('*')
    .single()

  if (error) {
    return failure('Não foi possível salvar o endereço.', error)
  }
  return { ok: true, data }
}

export async function deleteAddress(
  token: string,
  addressId: string,
): Promise<AddressResult<null>> {
  const { error } = await customerSupabase(token)
    .from('customer_addresses')
    .delete()
    .eq('id', addressId)

  if (error) {
    return failure('Não foi possível excluir o endereço.', error)
  }
  return { ok: true, data: null }
}

// O índice parcial customer_addresses_one_default_per_customer permite um único
// padrão por cliente, então é preciso desmarcar o antigo *antes* de marcar o
// novo — o caminho inverso esbarraria na violação de unicidade.
async function clearDefault(token: string): Promise<AddressResult<null>> {
  const { error } = await customerSupabase(token)
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('is_default', true)

  if (error) {
    return failure('Não foi possível atualizar o endereço padrão.', error)
  }
  return { ok: true, data: null }
}

export async function setDefaultAddress(
  token: string,
  addressId: string,
): Promise<AddressResult<null>> {
  const cleared = await clearDefault(token)
  if (!cleared.ok) {
    return cleared
  }

  const { error } = await customerSupabase(token)
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', addressId)

  if (error) {
    return failure('Não foi possível definir o endereço padrão.', error)
  }
  return { ok: true, data: null }
}

/** Linha única para exibição: "Rua X, 123 — Bairro, Cidade/UF". */
export function formatAddress(address: CustomerAddress): string {
  const street = [address.street, address.number].filter(Boolean).join(', ')
  const area = [address.district, [address.city, address.state].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(', ')
  return [street, area].filter(Boolean).join(' — ')
}
