import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/features/restaurant/restaurant-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const extensionByType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

type UploadKind = 'logo' | 'cover'

const uploadConfig: Record<
  UploadKind,
  { bucket: string; column: 'logo_url' | 'cover_url'; maxBytes: number; label: string }
> = {
  logo: { bucket: 'logos', column: 'logo_url', maxBytes: 2 * 1024 * 1024, label: 'logo' },
  cover: { bucket: 'covers', column: 'cover_url', maxBytes: 5 * 1024 * 1024, label: 'capa' },
}

function UploadBlock({
  kind,
  currentUrl,
  restaurantId,
  onSaved,
  previewClassName,
}: {
  kind: UploadKind
  currentUrl: string | null
  restaurantId: string
  onSaved: () => void
  previewClassName: string
}) {
  const config = uploadConfig[kind]
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
    if (file.size > config.maxBytes) {
      setError(`Arquivo muito grande. Limite: ${Math.round(config.maxBytes / 1024 / 1024)} MB.`)
      return
    }
    setUploading(true)
    // Nome único por envio: evita servir versão antiga do cache do CDN.
    const path = `${restaurantId}/${kind}-${Date.now()}.${extensionByType[file.type]}`
    const { error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(path, file, { contentType: file.type, cacheControl: '3600' })
    if (uploadError) {
      setUploading(false)
      setError('Falha no envio da imagem. Tente de novo.')
      return
    }
    const { data } = supabase.storage.from(config.bucket).getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('restaurants')
      .update(
        config.column === 'logo_url'
          ? { logo_url: data.publicUrl }
          : { cover_url: data.publicUrl },
      )
      .eq('id', restaurantId)
    setUploading(false)
    if (updateError) {
      setError('Imagem enviada, mas não foi possível vinculá-la. Tente de novo.')
      return
    }
    onSaved()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm font-medium capitalize">{config.label}</p>
      {currentUrl ? (
        <img
          src={currentUrl}
          alt={`${config.label} atual do restaurante`}
          className={cn('border object-cover', previewClassName)}
        />
      ) : (
        <div
          className={cn(
            'bg-muted text-muted-foreground flex items-center justify-center border',
            previewClassName,
          )}
        >
          <ImagePlus className="size-6" />
        </div>
      )}
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
        {uploading ? 'Enviando…' : currentUrl ? 'Trocar imagem' : 'Enviar imagem'}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function BrandingCard({
  restaurant,
  onSaved,
}: {
  restaurant: Restaurant
  onSaved: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade visual</CardTitle>
        <CardDescription>
          Logo (quadrada, até 2 MB) e capa (paisagem, até 5 MB) da sua página.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-8">
        <UploadBlock
          kind="logo"
          currentUrl={restaurant.logo_url}
          restaurantId={restaurant.id}
          onSaved={onSaved}
          previewClassName="size-24 rounded-2xl"
        />
        <UploadBlock
          kind="cover"
          currentUrl={restaurant.cover_url}
          restaurantId={restaurant.id}
          onSaved={onSaved}
          previewClassName="h-24 w-64 rounded-xl"
        />
      </CardContent>
    </Card>
  )
}
