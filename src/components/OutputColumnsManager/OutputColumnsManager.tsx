import { useState } from 'react';
import type { InputColumn, OutputColumn } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { OutputColumnRecipeEditor } from '../OutputColumnRecipeEditor/OutputColumnRecipeEditor';
import { SortableList } from '../SortableList/SortableList';

type OutputColumnsManagerProps = {
  inputColumns?: InputColumn[];
  outputColumns: OutputColumn[];
  onChange: (columns: OutputColumn[]) => void;
};

export function OutputColumnsManager({
  inputColumns = [],
  outputColumns,
  onChange,
}: OutputColumnsManagerProps) {
  const [newColumnName, setNewColumnName] = useState('');
  const ordered = [...outputColumns].sort((a, b) => a.order - b.order);

  const addColumn = () => {
    const nextColumn: OutputColumn = {
      id: crypto.randomUUID(),
      label: newColumnName.trim() || 'Nueva columna',
      order: ordered.length,
      enabled: true,
      recipe: { type: 'empty' },
    };
    onChange([...ordered, nextColumn]);
    setNewColumnName('');
  };

  const move = (id: string, direction: -1 | 1) => {
    const index = ordered.findIndex((column) => column.id === id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }

    const nextColumns = [...ordered];
    const [item] = nextColumns.splice(index, 1);
    nextColumns.splice(nextIndex, 0, item);
    onChange(reorder(nextColumns));
  };

  const reorderColumns = (items: OutputColumn[]) => {
    onChange(reorder(items));
  };

  const updateOutputColumn = (id: string, nextColumn: OutputColumn) => {
    onChange(ordered.map((column) => (column.id === id ? nextColumn : column)));
  };

  const removeColumn = (id: string) => {
    onChange(reorder(ordered.filter((column) => column.id !== id)));
  };

  return (
    <div className="manager">
      <div className="sectionHeader">
        <p>Define las columnas finales del archivo y como se llena cada una.</p>
        <div className="inlineForm">
          <input value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} placeholder="Nueva columna" />
          <button type="button" onClick={addColumn}>Agregar</button>
        </div>
      </div>

      {ordered.length === 0 ? <p className="muted">No hay columnas de salida configuradas.</p> : null}

      <div className="listRows">
        <SortableList
          items={ordered}
          onChange={reorderColumns}
          renderItem={(outputColumn, handle) => {
            const index = ordered.findIndex((item) => item.id === outputColumn.id);

            return (
              <div className="listRow outputColumnRow">
                {handle}
                <strong>{index + 1}.</strong>
                <label className="field compact">
                  <span>Nombre de salida</span>
                  <input
                    value={outputColumn.label}
                    onChange={(event) => updateOutputColumn(outputColumn.id, { ...outputColumn, label: event.target.value })}
                  />
                </label>
                <label className="checkboxField">
                  <input
                    type="checkbox"
                    checked={outputColumn.enabled}
                    onChange={(event) => updateOutputColumn(outputColumn.id, { ...outputColumn, enabled: event.target.checked })}
                  />
                  Exportar
                </label>
                <OutputColumnRecipeEditor
                  column={outputColumn}
                  inputColumns={inputColumns}
                  outputColumns={ordered}
                  onChange={(nextColumn) => updateOutputColumn(outputColumn.id, nextColumn)}
                />
                <div className="rowActions">
                  <DeleteButton onClick={() => removeColumn(outputColumn.id)} />
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

function reorder(columns: OutputColumn[]) {
  return columns.map((column, order) => ({ ...column, order }));
}
