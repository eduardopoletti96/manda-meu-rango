import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'
import { authErrorMessage } from '@/features/auth/auth-errors'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Destino do link de redefinição enviado por e-mail. O link autentica o
// usuário com uma sessão temporária de recuperação; sem sessão, o link é
// inválido ou expirou.
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Erros do link (ex.: expirado) chegam no fragmento da URL antes de o
  // Supabase limpá-lo; capturados uma única vez na montagem.
  const [linkErrorCode] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('error_code') ?? undefined,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      setError(authErrorMessage(updateError))
      return
    }
    navigate('/admin', { replace: true })
  }

  if (loading) {
    return (
      <AuthScreen title="Redefinir senha">
        <p className="text-muted-foreground text-sm">Validando link…</p>
      </AuthScreen>
    )
  }

  if (!session) {
    return (
      <AuthScreen title="Redefinir senha">
        <div className="flex flex-col gap-4">
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
          >
            {linkErrorCode === 'otp_expired'
              ? 'Este link expirou. Solicite um novo para continuar.'
              : 'Link inválido ou expirado. Solicite um novo para continuar.'}
          </p>
          <Button asChild>
            <Link to="/admin/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title="Redefinir senha" description="Escolha a nova senha de acesso ao painel.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmation">Confirmar nova senha</Label>
          <Input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthScreen>
  )
}
