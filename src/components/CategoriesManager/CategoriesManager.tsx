import { useState } from 'react';
import { createCategory, sortCategories } from '../../services/localCategoriesService';
import type { OutputCategory } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { SortableList } from '../SortableList/SortableList';

type CategoriesManagerProps = {
  categories: OutputCategory[];
  onChange: (categories: OutputCategory[]) => void;
};

export function CategoriesManager({ categories, onChange }: CategoriesManagerProps) {
  const [newName, setNewName] = useState('');
  const ordered = sortCategories(categories);

  const addCategory = () => {
    const next = createCategory(newName, ordered.length);
    onChange([...ordered, next]);
    setNewName('');
  };

  const updateName = (id: string, name: string) => {
    onChange(ordered.map((category) => (category.id === id ? { ...category, name } : category)));
  };

  const updateExportable = (id: string, exportable: boolean) => {
    onChange(ordered.map((category) => (category.id === id ? { ...category, exportable } : category)));
  };

  const removeCategory = (id: string) => {
    onChange(reorder(ordered.filter((category) => category.id !== id)));
  };

  const reorderCategories = (items: OutputCategory[]) => {
    onChange(reorder(items));
  };

  return (
    <div className="manager">
      <div className="sectionHeader">
        <p>Las categorias son las columnas posibles del archivo de salida.</p>
        <div className="inlineForm">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nueva categoria" />
          <button type="button" onClick={addCategory}>
            Agregar
          </button>
        </div>
      </div>

      <div className="listRows">
        <SortableList
          items={ordered}
          onChange={reorderCategories}
          renderItem={(category, handle) => (
          <div className="listRow categoryRow">
            {handle}
            <input value={category.name} onChange={(event) => updateName(category.id, event.target.value)} />
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={category.exportable}
                onChange={(event) => updateExportable(category.id, event.target.checked)}
              />
              Exportar
            </label>
            <DeleteButton onClick={() => removeCategory(category.id)} />
          </div>
        )}
        />
      </div>
    </div>
  );
}

function reorder(categories: OutputCategory[]) {
  return categories.map((category, index) => ({ ...category, order: index }));
}
