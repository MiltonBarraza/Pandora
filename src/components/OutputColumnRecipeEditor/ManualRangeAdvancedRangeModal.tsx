import { useEffect, useMemo, useState } from 'react';
import {
  parseManualRangeRowInput,
  reconcileManualRangeTextSelections,
  updateManualRangeFixedTextValue,
  updateManualRangeInputValue,
  updateManualRangeRangeTextValue,
  updateManualRangeValueRecipeSteps,
  updateManualRangeValueSourceType,
} from '../../domain/import/manualRangeModel';
import type { InputColumn, InputRow, ManualRangeValue, TransformStep } from '../../types/import';
import { Modal } from '../Modal/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import {
  getManualRangeSpreadsheetCellValue,
  getManualRangeSpreadsheetColumnLabel,
  removeManualRangeFromRecipe,
  updateManualRangeInRecipe,
  type ManualRangeRecipe,
} from './ManualRangeSpreadsheetEditor.helpers';
import { RangeValueEditor } from './RangeValueEditor';

type ManualRangeAdvancedRangeModalProps = {
  open: boolean;
  recipe: ManualRangeRecipe;
  range: ManualRangeValue | null;
  inputColumns: InputColumn[];
  manualRangeRows: InputRow[];
  onChange: (recipe: ManualRangeRecipe) => void;
  onClose: () => void;
  onRemove: () => void;
};

function cloneRange(range: ManualRangeValue): ManualRangeValue {
  return JSON.parse(JSON.stringify(range)) as ManualRangeValue;
}

function getRangeSnapshot(range: ManualRangeValue | null): string {
  return JSON.stringify(range);
}

export function ManualRangeAdvancedRangeModal({
  open,
  recipe,
  range,
  inputColumns,
  manualRangeRows,
  onChange,
  onClose,
  onRemove,
}: ManualRangeAdvancedRangeModalProps) {
  const [draftRange, setDraftRange] = useState<ManualRangeValue | null>(() => (open && range ? cloneRange(range) : null));
  const [originalRangeSnapshot, setOriginalRangeSnapshot] = useState(() => (open && range ? getRangeSnapshot(range) : ''));
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const isDirty = pendingDelete || getRangeSnapshot(draftRange) !== originalRangeSnapshot;

  useEffect(() => {
    if (!open || !range) {
      return;
    }

    const nextDraftRange = cloneRange(range);
    setDraftRange(nextDraftRange);
    setOriginalRangeSnapshot(getRangeSnapshot(nextDraftRange));
    setPendingDelete(false);
    setIsDiscardConfirmOpen(false);
  }, [open, range]);

  const modalHeaderDetails = useMemo(() => (
    draftRange ? <span>Filas {draftRange.startRowNumber} - {draftRange.endRowNumber}</span> : null
  ), [draftRange]);
  const coveredRows = useMemo(() => {
    if (!draftRange) {
      return [];
    }

    const startRowNumber = Math.min(draftRange.startRowNumber, draftRange.endRowNumber);
    const endRowNumber = Math.max(draftRange.startRowNumber, draftRange.endRowNumber);
    return manualRangeRows.filter((row) => row.rowNumber >= startRowNumber && row.rowNumber <= endRowNumber);
  }, [draftRange, manualRangeRows]);
  const coveredColumns = useMemo(() => inputColumns.slice(0, 4), [inputColumns]);

  if (!open || !range || !draftRange) {
    return null;
  }

  const requestClose = () => {
    if (isDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    onClose();
  };
  const discardAndClose = () => {
    setIsDiscardConfirmOpen(false);
    onClose();
  };
  const updateDraftRange = (updater: (current: ManualRangeValue) => ManualRangeValue) => {
    setDraftRange((current) => (current ? updater(current) : current));
  };
  const updateDraftRecipe = (updater: (currentRecipe: ManualRangeRecipe, rangeId: string) => ManualRangeRecipe) => {
    updateDraftRange((current) => {
      const currentRecipe: ManualRangeRecipe = { ...recipe, ranges: [current] };
      return updater(currentRecipe, current.id).ranges[0] ?? current;
    });
  };
  const updateRowNumber = (field: 'startRowNumber' | 'endRowNumber', value: string) => {
    const rowNumber = parseManualRangeRowInput(value);
    if (rowNumber === undefined) {
      return;
    }

    updateDraftRange((current) => ({ ...current, [field]: rowNumber }));
  };
  const accept = () => {
    if (pendingDelete) {
      onChange(removeManualRangeFromRecipe(recipe, draftRange.id));
      onRemove();
      onClose();
      return;
    }

    onChange(updateManualRangeInRecipe(recipe, draftRange.id, draftRange));
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        title="Configurar rango"
        className="manualRangeAdvancedRangeModal"
        headerDetails={modalHeaderDetails}
        onClose={requestClose}
        footer={(
          <div className="manualRangeAdvancedRangeModalActions">
            <div className="manualRangeAdvancedRangeModalDestructiveActions">
              {pendingDelete ? (
                <button type="button" className="secondary" onClick={() => setPendingDelete(false)}>
                  Deshacer eliminación
                </button>
              ) : (
                <button type="button" className="secondary" onClick={() => setPendingDelete(true)}>
                  Eliminar rango
                </button>
              )}
            </div>
            <div className="manualRangeAdvancedRangeModalPrimaryActions">
              <button type="button" className="secondary" onClick={requestClose}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={accept}>
                Aceptar
              </button>
            </div>
          </div>
        )}
      >
        <div className="manualRangeAdvancedRangeModalBody">
          <div className="manualRangeAdvancedRangeModalFields">
            <label className="field compact">
              <span>Inicio</span>
              <input
                type="number"
                min="1"
                value={draftRange.startRowNumber}
                disabled={pendingDelete}
                onChange={(event) => updateRowNumber('startRowNumber', event.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Fin</span>
              <input
                type="number"
                min="1"
                value={draftRange.endRowNumber}
                disabled={pendingDelete}
                onChange={(event) => updateRowNumber('endRowNumber', event.target.value)}
              />
            </label>
          </div>
          <ManualRangeCoveredRowsPreview rows={coveredRows} columns={coveredColumns} />
          {pendingDelete ? (
            <p className="manualRangeAdvancedRangeModalDeleteNotice">Este rango se eliminará al aceptar.</p>
          ) : (
            <RangeValueEditor
              range={draftRange}
              inputColumns={inputColumns}
              manualRangeRows={manualRangeRows}
              onValueSourceTypeChange={(type) => updateDraftRecipe((currentRecipe, rangeId) => updateManualRangeValueSourceType(currentRecipe, rangeId, type, inputColumns))}
              onFixedTextChange={(value) => updateDraftRecipe((currentRecipe, rangeId) => updateManualRangeFixedTextValue(currentRecipe, rangeId, value))}
              onInputColumnChange={(inputColumnId) => updateDraftRecipe((currentRecipe, rangeId) => updateManualRangeInputValue(currentRecipe, rangeId, inputColumnId))}
              onRangeTextChange={(patch) => {
                updateDraftRecipe((currentRecipe, rangeId) => {
                  const nextPatch = patch.inputColumnId !== undefined && patch.selectedText === undefined
                    ? { ...patch, selectedText: '' }
                    : patch;
                  const nextRecipe = updateManualRangeRangeTextValue(currentRecipe, rangeId, nextPatch);
                  return reconcileManualRangeTextSelections(nextRecipe, rangeId, manualRangeRows);
                });
              }}
              onStepsChange={(steps: TransformStep[]) => updateDraftRecipe((currentRecipe, rangeId) => updateManualRangeValueRecipeSteps(currentRecipe, rangeId, steps))}
            />
          )}
        </div>
      </Modal>
      {isDiscardConfirmOpen ? (
        <ConfirmDialog
          open
          title="Descartar cambios"
          message="Hay cambios sin aplicar en este rango. ¿Querés descartarlos?"
          cancelLabel="Seguir editando"
          confirmLabel="Descartar"
          variant="danger"
          onCancel={() => setIsDiscardConfirmOpen(false)}
          onConfirm={discardAndClose}
        />
      ) : null}
    </>
  );
}

function ManualRangeCoveredRowsPreview({
  rows,
  columns,
}: {
  rows: InputRow[];
  columns: InputColumn[];
}) {
  return (
    <section className="manualRangeCoveredRowsPreview">
      <div className="manualRangeCoveredRowsHeader">
        <strong>Filas cubiertas</strong>
        <p>Vista de las filas incluidas en este rango.</p>
      </div>
      {rows.length === 0 ? (
        <p className="manualRangeCoveredRowsEmpty">No hay filas visibles dentro de este rango.</p>
      ) : (
        <div className="manualRangeCoveredRowsScroller">
          <table className="manualRangeCoveredRowsTable">
            <thead>
              <tr>
                <th>Fila</th>
                {columns.map((column) => (
                  <th key={column.id}>{getManualRangeSpreadsheetColumnLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rowNumber}>
                  <th scope="row">{row.rowNumber}</th>
                  {columns.map((column) => {
                    const value = getManualRangeSpreadsheetCellValue(row, column.id);
                    return <td key={column.id} title={value}>{value || 'â€”'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
