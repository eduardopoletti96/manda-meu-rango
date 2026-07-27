import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/features/store/store-context'
import { digitsOnly, isValidBrazilPhone, maskBrazilPhone } from '@/features/customer/phone-mask'
import { sendPhoneToken, verifyPhoneToken } from '@/features/customer/customer-api'
import {
  useCustomerSessionStore,
  useIdentifiedCustomer,
} from '@/stores/customer-session-store'

const RESEND_SECONDS = 60

// 4.3 — Identificação do cliente por telefone. Duas etapas: dados (nome +
// telefone) e digitação do código recebido no WhatsApp, com reenvio por
// contador. Ao validar, guarda a sessão e segue para o destino (checkout).
// O carrinho é persistido à parte, então sobrevive a todo o fluxo.
export function IdentifyPage() {
  const { restaurant } = useStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Só aceitamos destinos dentro desta loja (evita redirecionar para fora).
  const rawNext = searchParams.get('next')
  const next =
    rawNext && rawNext.startsWith(`/${restaurant.slug}`)
      ? rawNext
      : `/${restaurant.slug}/checkout`

  const identified = useIdentifiedCustomer()
  const setSession = useCustomerSessionStore((state) => state.setSession)
  const clearSession = useCustomerSessionStore((state) => state.clear)

  const [step, setStep] = useState<'form' | 'code'>('form')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }
    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  async function requestCode(): Promise<boolean> {
    const result = await sendPhoneToken(digitsOnly(phone))
    if (!result.ok) {
      setError(result.error)
      return false
    }
    setDevCode(result.devCode ?? null)
    setSecondsLeft(RESEND_SECONDS)
    return true
  }

  async function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (name.trim().length === 0) {
      setError('Informe seu nome.')
      return
    }
    if (!isValidBrazilPhone(phone)) {
      setError('Informe um telefone válido com DDD.')
      return
    }
    setSubmitting(true)
    const ok = await requestCode()
    setSubmitting(false)
    if (ok) {
      setCode('')
      setStep('code')
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || submitting) {
      return
    }
    setError(null)
    setSubmitting(true)
    await requestCode()
    setSubmitting(false)
  }

  async function handleSubmitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!/^[0-9]{6}$/.test(code)) {
      setError('O código tem 6 dígitos.')
      return
    }
    setSubmitting(true)
    const result = await verifyPhoneToken({
      phoneDigits: digitsOnly(phone),
      name: name.trim(),
      code,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSession(result.token, result.customer, result.expiresInSeconds)
    void navigate(next, { replace: true })
  }

  const errorBox = error ? (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
      {error}
    </p>
  ) : null

  // Já identificado: oferece continuar ou trocar de número. Prova, no refresh,
  // que a sessão persiste.
  if (identified && step === 'form') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Identificação</h1>
        <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="text-success size-5" aria-hidden />
            <p>
              Você já está identificado como <strong>{identified.name}</strong>.
            </p>
          </div>
          <p className="text-muted-foreground text-sm">
            {maskBrazilPhone(identified.phone.replace(/^\+55/, ''))}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button className="rounded-2xl sm:flex-1" onClick={() => void navigate(next)}>
              Continuar
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                clearSession()
                setName('')
                setPhone('')
              }}
            >
              Trocar de número
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Voltar ao carrinho">
          <Link to={`/${restaurant.slug}/carrinho`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Identificação</h1>
      </div>

      {step === 'form' ? (
        <form
          onSubmit={handleSubmitForm}
          className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm"
        >
          <p className="text-muted-foreground text-sm">
            Para finalizar o pedido, confirme seu contato. Enviaremos um código pelo WhatsApp.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Seu nome</Label>
            <Input
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(51) 99999-9999"
              required
              value={phone}
              onChange={(event) => setPhone(maskBrazilPhone(event.target.value))}
            />
          </div>
          {errorBox}
          <Button type="submit" className="rounded-2xl" disabled={submitting}>
            <MessageCircle />
            {submitting ? 'Enviando…' : 'Enviar código'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmitCode}
          className="bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm"
        >
          <p className="text-muted-foreground text-sm">
            Enviamos um código de 6 dígitos para o WhatsApp{' '}
            <strong className="text-foreground">{phone}</strong>.
          </p>
          {devCode ? (
            <p className="bg-warning/15 rounded-md px-3 py-2 text-xs">
              Modo de teste — código: <strong>{devCode}</strong>
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              required
              className="text-center text-2xl tracking-[0.5em]"
              value={code}
              onChange={(event) => setCode(digitsOnly(event.target.value).slice(0, 6))}
            />
          </div>
          {errorBox}
          <Button type="submit" className="rounded-2xl" disabled={submitting || code.length < 6}>
            {submitting ? 'Confirmando…' : 'Confirmar'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep('form')
                setError(null)
              }}
            >
              Corrigir dados
            </button>
            <button
              type="button"
              className="text-primary font-medium hover:underline disabled:opacity-50 disabled:hover:no-underline"
              disabled={secondsLeft > 0 || submitting}
              onClick={() => void handleResend()}
            >
              {secondsLeft > 0 ? `Reenviar em ${secondsLeft}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
