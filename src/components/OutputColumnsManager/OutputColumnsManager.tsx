import { useEffect, useState } from 'react';
import { createOutputColumnsFromActiveInputColumns, hasGeneratedOutputColumnManualChanges } from '../../domain/import/createOutputColumnsFromActiveInputColumns';
import { duplicateOutputColumn } from '../../domain/import/duplicateOutputColumn';
import { showInfoToast, showSuccessToast } from '../../services/toastService';
import type { InputColumn, InputRow, OutputColumn } from '../../types/import';
import { DeleteButton } from '../DeleteButton/DeleteButton';
import { OutputColumnRecipeEditor } from '../OutputColumnRecipeEditor/OutputColumnRecipeEditor';
import { SortableList } from '../SortableList/SortableList';
import { ActionButton, ButtonGroup } from '../ui/ActionButton/ActionButton';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type OutputColumnsManagerProps = {
  inputColumns?: InputColumn[];
  manualRangeRows?: InputRow[];
  sampleInputValues?: Record<string, string>;
  outputColumns: OutputColumn[];
  onChange: (columns: OutputColumn[]) => void;
};

export function OutputColumnsManager({
  inputColumns = [],
  manualRangeRows = [],
  sampleInputValues,
  outputColumns,
  onChange,
}: OutputColumnsManagerProps) {
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isRegenerateConfirmationOpen, setIsRegenerateConfirmationOpen] = useState(false);
  const ordered = [...outputColumns].sort((a, b) => a.order - b.order);
  const selectedColumn = ordered.find((column) => column.id === selectedColumnId) ?? ordered[0];

  useEffect(() => {
    if (ordered.length === 0) {
      setSelectedColumnId(null);
      return;
    }

    if (!selectedColumnId || !ordered.some((column) => column.id === selectedColumnId)) {
      setSelectedColumnId(ordered[0].id);
    }
  }, [ordered, selectedColumnId]);

  const addColumn = () => {
    const nextColumn: OutputColumn = {
      id: crypto.randomUUID(),
      label: newColumnName.trim() || 'Nueva columna',
      order: ordered.length,
      enabled: true,
      recipe: { type: 'empty' },
    };
    onChange([...ordered, nextColumn]);
    setSelectedColumnId(nextColumn.id);
    setNewColumnName('');
  };

  const createFromActiveColumns = () => {
    if (hasGeneratedOutputColumnManualChanges(inputColumns, ordered)) {
      setIsRegenerateConfirmationOpen(true);
      return;
    }

    regenerateFromActiveColumns();
  };

  const regenerateFromActiveColumns = () => {
    const result = createOutputColumnsFromActiveInputColumns(inputColumns, ordered);

    if (result.activeCount === 0) {
      showInfoToast('No hay columnas activas para crear.');
      return;
    }

    onChange(result.columns);
    setSelectedColumnId(result.columns[result.columns.length - result.createdCount]?.id ?? result.columns[0]?.id ?? null);

    if (result.removedObsoleteCount > 0) {
      showSuccessToast(`Se regeneraron ${result.createdCount} columnas. ${result.removedObsoleteCount} obsoletas se quitaron.`);
      return;
    }

    showSuccessToast(`Se regeneraron ${result.createdCount} columnas.`);
  };

  const confirmRegenerateFromActiveColumns = () => {
    setIsRegenerateConfirmationOpen(false);
    regenerateFromActiveColumns();
  };

  const reorderColumns = (items: OutputColumn[]) => {
    onChange(reorder(items));
  };

  const updateOutputColumn = (id: string, nextColumn: OutputColumn) => {
    onChange(ordered.map((column) => (column.id === id ? nextColumn : column)));
  };

  const removeColumn = (id: string) => {
    const index = ordered.findIndex((column) => column.id === id);
    const nextColumns = reorder(ordered.filter((column) => column.id !== id));
    onChange(nextColumns);

    if (selectedColumnId === id) {
      setSelectedColumnId(nextColumns[index]?.id ?? nextColumns[index - 1]?.id ?? null);
    }
  };

  const duplicateColumn = (id: string) => {
    const index = ordered.findIndex((column) => column.id === id);
    if (index === -1) {
      return;
    }

    const nextColumn = duplicateOutputColumn(ordered[index]);
    const nextColumns = reorder([
      ...ordered.slice(0, index + 1),
      nextColumn,
      ...ordered.slice(index + 1),
    ]);
    onChange(nextColumns);
    setSelectedColumnId(nextColumn.id);
  };

  return (
    <div className="manager">
      <ConfirmDialog
        open={isRegenerateConfirmationOpen}
        title="Regenerar columnas de salida"
        message="Se perderán los cambios manuales hechos sobre columnas generadas automáticamente."
        cancelLabel="Seguir editando"
        confirmLabel="Regenerar columnas"
        variant="danger"
        onCancel={() => setIsRegenerateConfirmationOpen(false)}
        onConfirm={confirmRegenerateFromActiveColumns}
      />
      <div className="managerSummaryRow">
        <p className="muted">
          {ordered.length === 0
            ? 'No hay columnas de salida configuradas.'
            : `${ordered.length} ${ordered.length === 1 ? 'columna configurada' : 'columnas configuradas'}.`}
        </p>
        <div className="outputColumnsHeaderActions">
          <div className="inlineForm">
            <input
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') {
                  return;
                }

                event.preventDefault();
                addColumn();
              }}
              placeholder="Nueva columna"
            />
            <InfoTooltip content="Agrega una columna nueva al archivo final.">
              <ActionButton type="button" action="add" onClick={addColumn}>Agregar</ActionButton>
            </InfoTooltip>
          </div>
          <ButtonGroup>
            <InfoTooltip content="Regenera columnas de salida desde las columnas activas.">
              <ActionButton action="duplicate" variant="secondary" onClick={createFromActiveColumns}>
                Agregar columnas activas
              </ActionButton>
            </InfoTooltip>
          </ButtonGroup>
        </div>
      </div>

      {ordered.length > 0 ? (
        <div className="outputColumnsWorkspace">
          <div className="outputColumnsList">
            <SortableList
              items={ordered}
              onChange={reorderColumns}
              renderItem={(outputColumn, handle) => {
                const index = ordered.findIndex((item) => item.id === outputColumn.id);
                const isSelected = outputColumn.id === selectedColumn?.id;

                return (
                  <div className={`outputColumnListItem${isSelected ? ' selected' : ''}`}>
                    {handle}
                    <OutputColumnSelectButton
                      index={index}
                      label={outputColumn.label || 'Sin nombre'}
                      onClick={() => setSelectedColumnId(outputColumn.id)}
                    />
                    <InfoTooltip content="Duplicar columna">
                      <ActionButton
                        action="duplicate"
                        variant="icon"
                        size="sm"
                        className="outputColumnDuplicateButton"
                        aria-label="Duplicar columna"
                        onClick={() => duplicateColumn(outputColumn.id)}
                      />
                    </InfoTooltip>
                    <InfoTooltip content="Eliminar columna">
                      <DeleteButton title="Eliminar columna" onClick={() => removeColumn(outputColumn.id)} />
                    </InfoTooltip>
                  </div>
                );
              }}
            />
          </div>

          <div className="outputColumnDetailPanel">
            {selectedColumn ? (
              <>
                <div className="outputColumnHeader">
                  <label className="field compact outputNameField">
                    <span className="labelWithInfo">
                      <span>Nombre de salida</span>
                      <InfoTooltip content="Este nombre se usara como encabezado final." />
                    </span>
                    <input
                      value={selectedColumn.label}
                      onChange={(event) => updateOutputColumn(selectedColumn.id, { ...selectedColumn, label: event.target.value })}
                    />
                  </label>
                </div>
                <div className="outputColumnBody">
                  <OutputColumnRecipeEditor
                    column={selectedColumn}
                    inputColumns={inputColumns}
                    manualRangeRows={manualRangeRows}
                    sampleInputValues={sampleInputValues}
                    onChange={(nextColumn) => updateOutputColumn(selectedColumn.id, nextColumn)}
                  />
                </div>
              </>
            ) : (
              <p className="muted">Agrega una columna de salida para configurarla.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function reorder(columns: OutputColumn[]) {
  return columns.map((column, order) => ({ ...column, order }));
}

function OutputColumnSelectButton({
  index,
  label,
  onClick,
}: {
  index: number;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      className="outputColumnSelectButton"
      onClick={onClick}
    >
      <span className="columnItemText">{index + 1}. {label}</span>
    </button>
  );

  if (!shouldShowOutputColumnNameTooltip(label)) {
    return button;
  }

  return (
    <InfoTooltip content={label}>
      {button}
    </InfoTooltip>
  );
}

export function shouldShowOutputColumnNameTooltip(label: string) {
  return label.trim().length > 24;
}
