import type { ReactNode } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
};

export function SortableList<T extends { id: string }>({ items, onChange, renderItem }: SortableListProps<T>) {
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
          <SortableRow key={item.id} id={item.id}>
            {(handle) => renderItem(item, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handle = (
    <button
      type="button"
      className="dragHandle"
      title="Arrastrar para ordenar"
      aria-label="Arrastrar para ordenar"
      {...attributes}
      {...listeners}
    >
      ☰
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'sortableDragging' : undefined}>
      {children(handle)}
    </div>
  );
}
