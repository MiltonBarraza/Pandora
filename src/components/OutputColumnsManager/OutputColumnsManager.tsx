import type { OutputCategory } from '../../types/import';
import { SortableList } from '../SortableList/SortableList';

type OutputColumnsManagerProps = {
  categories: OutputCategory[];
  onChange: (categories: OutputCategory[]) => void;
};

export function OutputColumnsManager({ categories, onChange }: OutputColumnsManagerProps) {
  const ordered = [...categories].filter((category) => category.exportable).sort((a, b) => a.order - b.order);

  const move = (id: string, direction: -1 | 1) => {
    const index = ordered.findIndex((category) => category.id === id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }

    const nextExportable = [...ordered];
    const allNonExportable = categories.filter((category) => !category.exportable);
    const [item] = nextExportable.splice(index, 1);
    nextExportable.splice(nextIndex, 0, item);
    onChange([...nextExportable, ...allNonExportable].map((category, order) => ({ ...category, order })));
  };

  const reorderExportable = (items: OutputCategory[]) => {
    const allNonExportable = categories.filter((category) => !category.exportable);
    onChange([...items, ...allNonExportable].map((category, order) => ({ ...category, order })));
  };

  if (ordered.length === 0) {
    return <p className="muted">No hay columnas marcadas para exportar.</p>;
  }

  return (
    <div className="listRows">
      <SortableList
        items={ordered}
        onChange={reorderExportable}
        renderItem={(category, handle) => {
          const index = ordered.findIndex((item) => item.id === category.id);

          return (
        <div className="listRow outputColumnRow">
          {handle}
          <strong>{index + 1}. {category.name}</strong>
          <div className="rowActions">
            <button type="button" className="ghost" disabled={index === 0} onClick={() => move(category.id, -1)}>
              Subir
            </button>
            <button type="button" className="ghost" disabled={index === ordered.length - 1} onClick={() => move(category.id, 1)}>
              Bajar
            </button>
          </div>
        </div>
          );
        }}
      />
    </div>
  );
}
