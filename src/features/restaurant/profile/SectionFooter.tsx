import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SectionFeedback = { kind: 'success' | 'error'; text: string } | null

// Rodapé padrão das seções do perfil: botão de salvar + feedback inline.
export function SectionFooter({
  saving,
  feedback,
  label = 'Salvar alterações',
}: {
  saving: boolean
  feedback: SectionFeedback
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={saving}>
        {saving ? 'Salvando…' : label}
      </Button>
      {feedback ? (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'text-sm',
            feedback.kind === 'success' ? 'text-success' : 'text-destructive',
          )}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}
