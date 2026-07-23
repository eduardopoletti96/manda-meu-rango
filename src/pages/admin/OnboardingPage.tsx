import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { isValidSlug, slugify, SLUG_MAX_LENGTH } from '@/lib/slug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'

const slugHints: Record<SlugStatus, { text: string; tone: string } | null> = {
  idle: null,
  invalid: {
    text: 'Use de 3 a 63 caracteres: letras minúsculas, números e hífens.',
    tone: 'text-destructive',
  },
  checking: { text: 'Verificando disponibilidade…', tone: 'text-muted-foreground' },
  available: { text: 'Endereço disponível ✓', tone: 'text-success' },
  taken: { text: 'Este endereço já está em uso. Escolha outro.', tone: 'text-destructive' },
}

// Onboarding do restaurante (tarefa 2.2): cria o registro em restaurants;
// o trigger assign_restaurant_owner vincula o criador como owner.
export function OnboardingPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  // Resultado da última verificação de disponibilidade; guarda o slug
  // consultado para descartar respostas obsoletas na renderização.
  const [slugCheck, setSlugCheck] = useState<{ slug: string; taken: boolean } | null>(null)
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Consulta a disponibilidade com debounce. A palavra final é do insert
  // (constraint unique); aqui é só feedback antecipado.
  useEffect(() => {
    if (!slug || !isValidSlug(slug)) {
      return
    }
    const timer = setTimeout(async () => {
      const { data, error: queryError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!queryError) {
        setSlugCheck({ slug, taken: data !== null })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [slug])

  const slugStatus: SlugStatus = !slug
    ? 'idle'
    : !isValidSlug(slug)
      ? 'invalid'
      : slugCheck?.slug === slug
        ? slugCheck.taken
          ? 'taken'
          : 'available'
        : 'checking'

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) {
      setSlug(slugify(value))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!isValidSlug(slug) || slugStatus === 'taken') {
      return
    }
    setSubmitting(true)
    const { error: insertError } = await supabase
      .from('restaurants')
      .insert({
        name: name.trim(),
        slug,
        phone: phone.trim() || null,
        description: description.trim() || null,
      })
      .select('id')
      .single()
    setSubmitting(false)
    if (insertError) {
      if (insertError.code === '23505') {
        setSlugCheck({ slug, taken: true })
        return
      }
      setError('Não foi possível criar o restaurante. Tente de novo em instantes.')
      return
    }
    navigate('/admin', { replace: true })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <AuthScreen
      title="Cadastre seu restaurante"
      description="Esses dados aparecem para seus clientes. Dá para ajustar tudo depois no painel."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome do restaurante</Label>
          <Input
            id="name"
            required
            maxLength={80}
            placeholder="Ex.: Cantina da Nonna"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">Endereço da sua página</Label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm">{window.location.host}/</span>
            <Input
              id="slug"
              required
              maxLength={SLUG_MAX_LENGTH}
              placeholder="cantina-da-nonna"
              value={slug}
              aria-invalid={slugStatus === 'invalid' || slugStatus === 'taken'}
              onChange={(event) => {
                setSlugEdited(true)
                setSlug(event.target.value.toLowerCase())
              }}
            />
          </div>
          {slugHints[slugStatus] ? (
            <p className={cn('text-sm', slugHints[slugStatus].tone)}>
              {slugHints[slugStatus].text}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefone / WhatsApp (opcional)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Descrição curta (opcional)</Label>
          <Input
            id="description"
            maxLength={160}
            placeholder="Ex.: Comida italiana caseira"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting || slugStatus === 'taken'}>
          {submitting ? 'Criando…' : 'Criar restaurante'}
        </Button>
        <button
          type="button"
          onClick={handleLogout}
          className="text-muted-foreground text-center text-sm hover:underline"
        >
          Sair da conta
        </button>
      </form>
    </AuthScreen>
  )
}
