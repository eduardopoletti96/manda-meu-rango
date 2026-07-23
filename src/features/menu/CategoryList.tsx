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
import { cn } from '@/lib/utils'
import { categoryItemCount, type CategoryWithCount } from './types'

function SortableRow({
  category,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  category: CategoryWithCount
  onToggleActive: (category: CategoryWithCount, active: boolean) => void
  onEdit: (category: CategoryWithCount) => void
  onDelete: (category: CategoryWithCount) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })
  const itemCount = categoryItemCount(category)

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
        aria-label={`Reordenar ${category.name}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none py-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {category.image_url ? (
        <img
          src={category.image_url}
          alt=""
          className="size-12 shrink-0 rounded-lg border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg border">
          <ImageIcon className="size-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', !category.is_active && 'text-muted-foreground')}>
          {category.name}
        </p>
        <p className="text-muted-foreground text-sm">
          {itemCount === 1 ? '1 item' : `${itemCount} itens`}
          {!category.is_active && ' · inativa'}
        </p>
      </div>
      <Switch
        aria-label={`${category.is_active ? 'Desativar' : 'Ativar'} ${category.name}`}
        checked={category.is_active}
        onCheckedChange={(active) => onToggleActive(category, active)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Editar ${category.name}`}
        onClick={() => onEdit(category)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Excluir ${category.name}`}
        className="text-destructive hover:text-destructive"
        onClick={() => onDelete(category)}
      >
        <Trash2 />
      </Button>
    </li>
  )
}

export function CategoryList({
  categories,
  onReorder,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  categories: CategoryWithCount[]
  onReorder: (next: CategoryWithCount[]) => void
  onToggleActive: (category: CategoryWithCount, active: boolean) => void
  onEdit: (category: CategoryWithCount) => void
  onDelete: (category: CategoryWithCount) => void
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
    const from = categories.findIndex((category) => category.id === active.id)
    const to = categories.findIndex((category) => category.id === over.id)
    onReorder(arrayMove(categories, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={categories.map((category) => category.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <SortableRow
              key={category.id}
              category={category}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
