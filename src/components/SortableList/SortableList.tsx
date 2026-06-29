import type { ReactNode } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppIcon } from '../ui/AppIcon/AppIcon';

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onChange: (items: T[]) => void;
  handleContent?: ReactNode;
  handleLabel?: string;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
};

type SortableTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

export function SortableList<T extends { id: string }>({ items, onChange, handleContent, handleLabel = 'Arrastrar para ordenar', renderItem }: SortableListProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableRow key={item.id} id={item.id} handleContent={handleContent} handleLabel={handleLabel}>
            {(handle) => renderItem(item, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  handleContent,
  handleLabel,
  children,
}: {
  id: string;
  handleContent?: ReactNode;
  handleLabel: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: getVerticalSortableTransform(transform),
    transition,
  };

  const handle = (
    <button
      type="button"
      className="dragHandle"
      aria-label={handleLabel}
      title={handleLabel}
      {...attributes}
      {...listeners}
    >
      {handleContent ?? <AppIcon name="reorder" aria-hidden="true" focusable="false" />}
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={`sortableRow${isDragging ? ' sortableDragging' : ''}`}>
      {children(handle)}
    </div>
  );
}

export function getVerticalSortableTransform(transform: SortableTransform | null) {
  return CSS.Transform.toString(transform ? { ...transform, x: 0 } : null);
}
