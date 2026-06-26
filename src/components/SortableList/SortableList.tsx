import type { ReactNode } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableAxis = 'vertical' | 'horizontal';

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onChange: (items: T[]) => void;
  axis?: SortableAxis;
  handleContent?: ReactNode;
  handleLabel?: string;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
};

type SortableTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
} & Record<string, number>;

export function SortableList<T extends { id: string }>({ items, onChange, axis = 'vertical', handleContent, handleLabel = 'Arrastrar para ordenar', renderItem }: SortableListProps<T>) {
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
      <SortableContext items={items.map((item) => item.id)} strategy={axis === 'horizontal' ? horizontalListSortingStrategy : verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableRow key={item.id} id={item.id} axis={axis} handleContent={handleContent} handleLabel={handleLabel}>
            {(handle) => renderItem(item, handle)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  axis,
  handleContent,
  handleLabel,
  children,
}: {
  id: string;
  axis: SortableAxis;
  handleContent?: ReactNode;
  handleLabel: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: getSortableTransform(transform, axis),
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
      {handleContent ?? '☰'}
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={`sortableRow sortableRow-${axis}${isDragging ? ' sortableDragging' : ''}`}>
      {children(handle)}
    </div>
  );
}

export function getVerticalSortableTransform(transform: SortableTransform | null) {
  return CSS.Transform.toString(transform ? { ...transform, x: 0 } : null);
}

export function getHorizontalSortableTransform(transform: SortableTransform | null) {
  return CSS.Transform.toString(transform ? { ...transform, y: 0 } : null);
}

function getSortableTransform(transform: SortableTransform | null, axis: SortableAxis) {
  return axis === 'horizontal' ? getHorizontalSortableTransform(transform) : getVerticalSortableTransform(transform);
}
