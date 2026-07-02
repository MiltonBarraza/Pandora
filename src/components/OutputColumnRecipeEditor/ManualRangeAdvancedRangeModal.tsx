import { useEffect, useMemo, useState } from 'react';
import {
  parseManualRangeRowInput,
  reconcileManualRangeTextSelections,
  updateManualRangeFixedTextValue,
  updateManualRangeInputValue,
  updateManualRangeRangeTextValue,
  updateManualRangeValueRecipeSteps,
} from '../../domain/import/manualRangeModel';
import type { InputColumn, InputRow, ManualRangeValue, StepSource, TransformStep } from '../../types/import';
import { Modal } from '../Modal/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import {
  getManualRangeSpreadsheetCellValue,
  getManualRangeSpreadsheetColumnLabel,
  getManualRangePreviewValueForRow,
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
  visibleColumnIds: string[];
  showResultColumn: boolean;
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

export type ManualRangeBoundsValidation = {
  startRowNumber: number | null;
  endRowNumber: number | null;
  error: string | null;
};

function parseRequiredPositiveInteger(value: string): number | null {
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const rowNumber = Number(normalizedValue);
  return Number.isSafeInteger(rowNumber) && rowNumber >= 1 ? rowNumber : null;
}

export function validateManualRangeBounds(startRowInput: string, endRowInput: string): ManualRangeBoundsValidation {
  if (startRowInput.trim() === '' || endRowInput.trim() === '') {
    return { startRowNumber: null, endRowNumber: null, error: 'Completá las filas de inicio y fin.' };
  }

  const startRowNumber = parseRequiredPositiveInteger(startRowInput);
  const endRowNumber = parseRequiredPositiveInteger(endRowInput);
  if (startRowNumber === null || endRowNumber === null) {
    return { startRowNumber, endRowNumber, error: 'Las filas deben ser números enteros mayores o iguales a 1.' };
  }

  if (startRowNumber > endRowNumber) {
    return { startRowNumber, endRowNumber, error: 'La fila de inicio debe ser menor o igual a la fila de fin.' };
  }

  return { startRowNumber, endRowNumber, error: null };
}

export function ManualRangeAdvancedRangeModal({
  open,
  recipe,
  range,
  inputColumns,
  manualRangeRows,
  visibleColumnIds,
  showResultColumn,
  onChange,
  onClose,
  onRemove,
}: ManualRangeAdvancedRangeModalProps) {
  const [draftRange, setDraftRange] = useState<ManualRangeValue | null>(() => (open && range ? cloneRange(range) : null));
  const [startRowInput, setStartRowInput] = useState(() => (open && range ? String(range.startRowNumber) : ''));
  const [endRowInput, setEndRowInput] = useState(() => (open && range ? String(range.endRowNumber) : ''));
  const [originalRangeSnapshot, setOriginalRangeSnapshot] = useState(() => (open && range ? getRangeSnapshot(range) : ''));
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [useMainColumnView, setUseMainColumnView] = useState(true);
  const boundsValidation = validateManualRangeBounds(startRowInput, endRowInput);
  const hasUncommittedRowInput = draftRange
    ? startRowInput !== String(draftRange.startRowNumber)
      || endRowInput !== String(draftRange.endRowNumber)
    : false;
  const isDirty = pendingDelete || hasUncommittedRowInput || getRangeSnapshot(draftRange) !== originalRangeSnapshot;
  const canAccept = pendingDelete || boundsValidation.error === null;

  useEffect(() => {
    if (!open || !range) {
      return;
    }

    const nextDraftRange = cloneRange(range);
    setDraftRange(nextDraftRange);
    setStartRowInput(String(nextDraftRange.startRowNumber));
    setEndRowInput(String(nextDraftRange.endRowNumber));
    setOriginalRangeSnapshot(getRangeSnapshot(nextDraftRange));
    setPendingDelete(false);
    setIsDiscardConfirmOpen(false);
    setUseMainColumnView(true);
  }, [open, range]);

  const modalHeaderDetails = useMemo(() => (
    <span>Filas {startRowInput || '—'} - {endRowInput || '—'}</span>
  ), [endRowInput, startRowInput]);
  const coveredRows = useMemo(() => {
    if (boundsValidation.error || boundsValidation.startRowNumber === null || boundsValidation.endRowNumber === null) {
      return [];
    }

    return manualRangeRows.filter((row) => (
      row.rowNumber >= boundsValidation.startRowNumber!
      && row.rowNumber <= boundsValidation.endRowNumber!
    ));
  }, [boundsValidation.endRowNumber, boundsValidation.error, boundsValidation.startRowNumber, manualRangeRows]);
  const coveredColumns = useMemo(() => {
    if (!useMainColumnView) {
      return inputColumns;
    }

    const visibleColumnIdSet = new Set(visibleColumnIds);
    return inputColumns.filter((column) => visibleColumnIdSet.has(column.id));
  }, [inputColumns, useMainColumnView, visibleColumnIds]);
  const previewRanges = useMemo(() => {
    if (boundsValidation.error || boundsValidation.startRowNumber === null || boundsValidation.endRowNumber === null || !draftRange) {
      return recipe.ranges;
    }

    const previewRange = {
      ...draftRange,
      startRowNumber: boundsValidation.startRowNumber,
      endRowNumber: boundsValidation.endRowNumber,
    };
    return recipe.ranges.map((currentRange) => (currentRange.id === previewRange.id ? previewRange : currentRange));
  }, [boundsValidation.endRowNumber, boundsValidation.error, boundsValidation.startRowNumber, draftRange, recipe.ranges]);

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
  const updateDraftSource = (currentRecipe: ManualRangeRecipe, rangeId: string, source: StepSource) => {
    if (source.type === 'input') {
      return updateManualRangeInputValue(currentRecipe, rangeId, source.inputColumnId);
    }

    if (source.type === 'rangeText') {
      return reconcileManualRangeTextSelections(
        updateManualRangeRangeTextValue(currentRecipe, rangeId, {
          inputColumnId: source.inputColumnId,
          selectedText: source.selectedText,
        }),
        rangeId,
        manualRangeRows,
      );
    }

    if (source.type === 'fixedText') {
      return updateManualRangeFixedTextValue(currentRecipe, rangeId, source.value);
    }

    return currentRecipe;
  };
  const updateRowNumber = (field: 'startRowNumber' | 'endRowNumber', value: string) => {
    if (field === 'startRowNumber') {
      setStartRowInput(value);
    } else {
      setEndRowInput(value);
    }

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

    if (boundsValidation.error || boundsValidation.startRowNumber === null || boundsValidation.endRowNumber === null) {
      return;
    }

    onChange(updateManualRangeInRecipe(recipe, draftRange.id, {
      ...draftRange,
      startRowNumber: boundsValidation.startRowNumber,
      endRowNumber: boundsValidation.endRowNumber,
    }));
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
              <button type="button" className="primary" disabled={!canAccept} onClick={accept}>
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
                step="1"
                value={startRowInput}
                disabled={pendingDelete}
                aria-invalid={!pendingDelete && boundsValidation.error !== null}
                aria-describedby="manual-range-bounds-validation"
                onChange={(event) => updateRowNumber('startRowNumber', event.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Fin</span>
              <input
                type="number"
                min="1"
                step="1"
                value={endRowInput}
                disabled={pendingDelete}
                aria-invalid={!pendingDelete && boundsValidation.error !== null}
                aria-describedby="manual-range-bounds-validation"
                onChange={(event) => updateRowNumber('endRowNumber', event.target.value)}
              />
            </label>
          </div>
          {!pendingDelete ? (
            <p
              id="manual-range-bounds-validation"
              className={`manualRangeAdvancedRangeModalValidation${boundsValidation.error ? ' manualRangeAdvancedRangeModalValidation-error' : ''}`}
              role={boundsValidation.error ? 'alert' : undefined}
            >
              {boundsValidation.error ?? 'Inicio y fin usan números de fila reales del Excel.'}
            </p>
          ) : null}
          <ManualRangeCoveredRowsPreview
            rows={coveredRows}
            columns={coveredColumns}
            ranges={previewRanges}
            showResultColumn={showResultColumn}
            useMainColumnView={useMainColumnView}
            onUseMainColumnViewChange={setUseMainColumnView}
          />
          {pendingDelete ? (
            <p className="manualRangeAdvancedRangeModalDeleteNotice">Este rango se eliminará al aceptar.</p>
          ) : (
            <RangeValueEditor
              range={draftRange}
              inputColumns={inputColumns}
              manualRangeRows={manualRangeRows}
              onSourceAndStepsChange={(source, steps) => updateDraftRecipe((currentRecipe, rangeId) => {
                const nextRecipe = updateDraftSource(currentRecipe, rangeId, source);
                return updateManualRangeValueRecipeSteps(nextRecipe, rangeId, steps);
              })}
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
  ranges,
  showResultColumn,
  useMainColumnView,
  onUseMainColumnViewChange,
}: {
  rows: InputRow[];
  columns: InputColumn[];
  ranges: ManualRangeValue[];
  showResultColumn: boolean;
  useMainColumnView: boolean;
  onUseMainColumnViewChange: (checked: boolean) => void;
}) {
  return (
    <section className="manualRangeCoveredRowsPreview">
      <div className="manualRangeCoveredRowsHeader">
        <div>
          <strong>Filas cubiertas</strong>
          <p>Vista de las filas incluidas en este rango.</p>
        </div>
        <label className="checkboxField manualRangeCoveredRowsColumnToggle">
          <input
            type="checkbox"
            checked={useMainColumnView}
            onChange={(event) => onUseMainColumnViewChange(event.target.checked)}
          />
          <span>Usar mismas columnas que la tabla principal</span>
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="manualRangeCoveredRowsEmpty">No hay filas visibles dentro de este rango.</p>
      ) : (
        <div className="manualRangeCoveredRowsScroller">
          <table className="manualRangeCoveredRowsTable">
            <thead>
              <tr>
                <th className="manualRangeCoveredRowsRowNumberHeader">Fila</th>
                {columns.map((column) => (
                  <th key={column.id}>{getManualRangeSpreadsheetColumnLabel(column)}</th>
                ))}
                {showResultColumn ? <th className="manualRangeCoveredRowsResultHeader">Resultado</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rowNumber} className="manualRangeCoveredRowsRow">
                  <th scope="row" className="manualRangeCoveredRowsRowNumberCell">{row.rowNumber}</th>
                  {columns.map((column) => {
                    const value = getManualRangeSpreadsheetCellValue(row, column.id);
                    return <td key={column.id} title={value}>{value}</td>;
                  })}
                  {showResultColumn ? (
                    <td className="manualRangeCoveredRowsResultCell">
                      {getManualRangePreviewValueForRow(row.rowNumber, ranges, rows)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
