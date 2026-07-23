import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const extensionByType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// Upload genérico de imagem para um bucket do projeto. Envia na hora e
// devolve a URL pública via onChange; quem usa decide onde persistir.
export function ImageUploadInput({
  bucket,
  pathPrefix,
  value,
  onChange,
  maxBytes = 2 * 1024 * 1024,
  previewClassName = 'size-20 rounded-xl',
}: {
  bucket: string
  /** Primeira pasta do caminho — precisa ser o id do restaurante (RLS). */
  pathPrefix: string
  value: string | null
  onChange: (url: string) => void
  maxBytes?: number
  previewClassName?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato não suportado. Envie PNG, JPG ou WebP.')
      return
    }
    if (file.size > maxBytes) {
      setError(`Arquivo muito grande. Limite: ${Math.round(maxBytes / 1024 / 1024)} MB.`)
      return
    }
    setUploading(true)
    const path = `${pathPrefix}/${bucket}-${Date.now()}.${extensionByType[file.type]}`
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type, cacheControl: '3600' })
    setUploading(false)
    if (uploadError) {
      setError('Falha no envio da imagem. Tente de novo.')
      return
    }
    onChange(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl)
  }

  return (
    <div className="flex items-start gap-3">
      {value ? (
        <img src={value} alt="" className={cn('border object-cover', previewClassName)} />
      ) : (
        <div
          className={cn(
            'bg-muted text-muted-foreground flex items-center justify-center border',
            previewClassName,
          )}
        >
          <ImagePlus className="size-5" />
        </div>
      )}
      <div className="flex flex-col items-start gap-1">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Enviando…' : value ? 'Trocar imagem' : 'Enviar imagem'}
        </Button>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
