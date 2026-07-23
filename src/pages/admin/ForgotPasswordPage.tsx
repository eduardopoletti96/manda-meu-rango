import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { authErrorMessage } from '@/features/auth/auth-errors'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/redefinir-senha`,
    })
    setSubmitting(false)
    if (resetError) {
      setError(authErrorMessage(resetError))
      return
    }
    setSent(true)
  }

  return (
    <AuthScreen
      title="Recuperar senha"
      description="Informe seu e-mail e enviaremos um link para redefinir a senha."
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="bg-success/10 text-foreground rounded-md px-3 py-2 text-sm">
            Se existir uma conta para <strong>{email}</strong>, você receberá um link de
            redefinição em instantes. Confira também a caixa de spam.
          </p>
          <Button asChild variant="outline">
            <Link to="/admin/login">Voltar ao login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {error ? (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar link de redefinição'}
          </Button>
          <Link
            to="/admin/login"
            className="text-muted-foreground text-center text-sm hover:underline"
          >
            Voltar ao login
          </Link>
        </form>
      )}
    </AuthScreen>
  )
}
