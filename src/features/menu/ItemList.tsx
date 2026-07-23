import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MenuItem } from './types'

function SortableRow({
  item,
  onToggleAvailable,
  onEdit,
  onDelete,
}: {
  item: MenuItem
  onToggleAvailable: (item: MenuItem, available: boolean) => void
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-card flex items-center gap-3 rounded-xl border p-3',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        type="button"
        aria-label={`Reordenar ${item.name}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none py-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className="size-12 shrink-0 rounded-lg border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg border">
          <ImageIcon className="size-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', !item.is_available && 'text-muted-foreground')}>
          {item.name}
        </p>
        <p className="text-muted-foreground truncate text-sm">
          {formatBRL(item.price)}
          {item.description ? ` · ${item.description}` : ''}
          {!item.is_available && ' · indisponível'}
        </p>
      </div>
      <Switch
        aria-label={`${item.is_available ? 'Marcar como indisponível' : 'Marcar como disponível'}: ${item.name}`}
        checked={item.is_available}
        onCheckedChange={(available) => onToggleAvailable(item, available)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Editar ${item.name}`}
        onClick={() => onEdit(item)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Excluir ${item.name}`}
        className="text-destructive hover:text-destructive"
        onClick={() => onDelete(item)}
      >
        <Trash2 />
      </Button>
    </li>
  )
}

export function ItemList({
  items,
  onReorder,
  onToggleAvailable,
  onEdit,
  onDelete,
}: {
  items: MenuItem[]
  onReorder: (next: MenuItem[]) => void
  onToggleAvailable: (item: MenuItem, available: boolean) => void
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              onToggleAvailable={onToggleAvailable}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
