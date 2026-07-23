import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/auth-context'
import { authErrorMessage } from '@/features/auth/auth-errors'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Quem já está logado segue direto para o onboarding (ou painel).
  if (!loading && session) {
    return <Navigate to="/admin/onboarding" replace />
  }

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
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    setSubmitting(false)
    if (signUpError) {
      setError(authErrorMessage(signUpError))
      return
    }
    // Com "Confirm email" desligado a sessão vem imediatamente; se a
    // confirmação voltar a ser exigida (produção), orienta o usuário.
    if (!data.session) {
      setError('Conta criada. Confirme seu e-mail para continuar e depois faça login.')
      return
    }
    navigate('/admin/onboarding', { replace: true })
  }

  return (
    <AuthScreen
      title="Criar conta"
      description="Crie sua conta para cadastrar o restaurante no Manda meu Rango."
    >
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha</Label>
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
          <Label htmlFor="confirmation">Confirmar senha</Label>
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
          {submitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{' '}
          <Link to="/admin/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthScreen>
  )
}
