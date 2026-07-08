import { useState, type DragEvent } from 'react';
import { buildSuggestedCombineOutputColumns, normalizeCombineColumnName } from '../../domain/combine/combineColumnMappings';
import type { ColumnAssignmentMode, CombineOutputColumn, CombineSource } from '../../types/combine';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { AppIcon } from '../ui/AppIcon/AppIcon';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
import { WarningTooltip } from '../ui/WarningTooltip/WarningTooltip';

type CombineOutputColumnsProps = {
  sources: CombineSource[];
  outputColumns: CombineOutputColumn[];
  onChange: (columns: CombineOutputColumn[]) => void;
  assignmentMode?: ColumnAssignmentMode;
  onAssignmentModeChange?: (mode: ColumnAssignmentMode) => void;
};

export function CombineOutputColumns({
  sources,
  outputColumns,
  onChange,
  assignmentMode = 'name',
  onAssignmentModeChange = () => undefined,
}: CombineOutputColumnsProps) {
  const hasEmptyNames = outputColumns.some((column) => column.name.trim() === '');
  const hasDuplicateNames = getDuplicateNormalizedNames(outputColumns).length > 0;
  const outputColumnWarnings = [
    ...(hasEmptyNames ? ['Hay columnas de salida sin nombre.'] : []),
    ...(hasDuplicateNames ? ['Hay nombres de columnas de salida duplicados.'] : []),
  ];
  const outputColumnWarning = outputColumnWarnings.join(' ');
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const addColumn = () => {
    onChange([
      ...outputColumns,
      { id: crypto.randomUUID(), name: 'Nueva columna' },
    ]);
  };

  const generateColumns = () => {
    if (sources.length === 0) {
      return;
    }
    onChange(buildSuggestedCombineOutputColumns(sources, assignmentMode));
  };

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    const reordered = reorderCombineOutputColumns(outputColumns, fromIndex, toIndex);
    if (reordered !== outputColumns) {
      onChange(reordered);
    }
  };

  const startColumnDrag = (columnId: string, event: DragEvent<HTMLElement>) => {
    setDraggedColumnId(columnId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
  };

  const dropColumn = (targetColumnId: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const columnId = event.dataTransfer.getData('text/plain') || draggedColumnId;
    const fromIndex = outputColumns.findIndex((column) => column.id === columnId);
    const toIndex = outputColumns.findIndex((column) => column.id === targetColumnId);
    reorderColumns(fromIndex, toIndex);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  return (
    <section className="panel combineFlowPanel combineOutputColumnsPanel">
      <h2 className="headingWithInfo">
        <span>2. Columnas de salida</span>
        <InfoTooltip
          ariaLabel="Información sobre las columnas de salida"
          placement="right"
          content="Definí las columnas que tendrá el archivo combinado. Cada archivo cargado se asignará a esta estructura de salida."
        />
        {outputColumnWarning ? (
          <WarningTooltip content={outputColumnWarning} ariaLabel="Advertencia: 2. Columnas de salida" />
        ) : null}
      </h2>
      <div className="combineOutputColumnsToolbar">
        <fieldset className="combineAssignmentMode">
          <legend className="headingWithInfo">
            <span>Modo de asignación</span>
            <InfoTooltip
              ariaLabel="Información sobre el modo de asignación"
              placement="right"
              content="Por nombre compara encabezados equivalentes. Por posición empareja cada fuente según el orden de sus columnas."
            />
          </legend>
          <div className="combineAssignmentModeOptions">
            <label className={assignmentMode === 'name' ? 'isSelected' : undefined}>
              <input
                type="radio"
                name="combine-column-assignment-mode"
                value="name"
                checked={assignmentMode === 'name'}
                onChange={() => onAssignmentModeChange('name')}
              />
              <span>Por nombre</span>
            </label>
            <label className={assignmentMode === 'position' ? 'isSelected' : undefined}>
              <input
                type="radio"
                name="combine-column-assignment-mode"
                value="position"
                checked={assignmentMode === 'position'}
                onChange={() => onAssignmentModeChange('position')}
              />
              <span>Por posición</span>
            </label>
          </div>
        </fieldset>
        <div className="actions combineOutputColumnsActions">
          {sources.length > 0 && outputColumns.length === 0 ? (
            <InfoTooltip content="Genera columnas de salida según el modo de asignación seleccionado." placement="bottom">
              <ActionButton action="duplicate" onClick={generateColumns}>
                Generar columnas
              </ActionButton>
            </InfoTooltip>
          ) : null}
          <InfoTooltip content="Agrega una columna manual al archivo combinado." placement="bottom">
            <ActionButton
              action="add"
              onClick={addColumn}
            >
              Agregar columna
            </ActionButton>
          </InfoTooltip>
        </div>
      </div>

      {outputColumns.length === 0 ? (
        <div className="emptyState combineOutputColumnsEmpty">
          Todavía no hay columnas de salida. Generá columnas automáticamente o agregá una columna manualmente.
        </div>
      ) : (
        <div className="combineOutputColumnList">
          {outputColumns.map((column, index) => (
            <div
              key={column.id}
              className={`combineOutputColumnItem${draggedColumnId === column.id ? ' isDragging' : ''}${dragOverColumnId === column.id && draggedColumnId !== column.id ? ' isDragTarget' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverColumnId(column.id);
              }}
              onDragLeave={() => setDragOverColumnId((current) => current === column.id ? null : current)}
              onDrop={(event) => dropColumn(column.id, event)}
            >
              <label>
                <span>Columna {index + 1}</span>
                <input
                  value={column.name}
                  aria-label={`Nombre de columna de salida ${index + 1}`}
                  onChange={(event) => onChange(outputColumns.map((item) => (
                    item.id === column.id ? { ...item, name: event.target.value } : item
                  )))}
                />
              </label>
              <div className="combineOutputColumnActions">
                <span
                  className="dragHandle combineOutputColumnDragHandle"
                  draggable
                  aria-hidden="true"
                  onDragStart={(event) => startColumnDrag(column.id, event)}
                  onDragEnd={() => {
                    setDraggedColumnId(null);
                    setDragOverColumnId(null);
                  }}
                >
                  <AppIcon name="reorder" size={18} />
                </span>
                <InfoTooltip content="Remover" placement="left">
                  <DeleteButton
                    title={`Remover columna ${column.name || index + 1}`}
                    onClick={() => onChange(outputColumns.filter((item) => item.id !== column.id))}
                  />
                </InfoTooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getDuplicateNormalizedNames(outputColumns: CombineOutputColumn[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  outputColumns.forEach((column) => {
    const normalizedName = normalizeCombineColumnName(column.name);
    if (!normalizedName) {
      return;
    }
    if (seen.has(normalizedName)) {
      duplicates.add(normalizedName);
    }
    seen.add(normalizedName);
  });

  return [...duplicates];
}

export function reorderCombineOutputColumns(
  outputColumns: CombineOutputColumn[],
  fromIndex: number,
  toIndex: number,
) {
  if (
    fromIndex === toIndex
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= outputColumns.length
    || toIndex >= outputColumns.length
  ) {
    return outputColumns;
  }

  const reordered = [...outputColumns];
  const [movedColumn] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedColumn);
  return reordered;
}
