import { useEffect, useMemo, useState } from 'react';
import type { InputColumn } from '../../types/import';
import { Modal } from '../Modal/Modal';
import {
  getDefaultManualRangeVisibleColumnIds,
  getManualRangeSpreadsheetColumnLabel,
  reconcileManualRangeVisibleColumnIds,
} from './ManualRangeSpreadsheetEditor.helpers';

type ManualRangeColumnsModalProps = {
  open: boolean;
  inputColumns: InputColumn[];
  visibleColumnIds: string[];
  showResultColumn: boolean;
  onApply: (nextState: { visibleColumnIds: string[]; showResultColumn: boolean }) => void;
  onClose: () => void;
};

export function ManualRangeColumnsModal({
  open,
  inputColumns,
  visibleColumnIds,
  showResultColumn,
  onApply,
  onClose,
}: ManualRangeColumnsModalProps) {
  const [draftColumnIds, setDraftColumnIds] = useState<string[]>(visibleColumnIds);
  const [draftShowResultColumn, setDraftShowResultColumn] = useState(showResultColumn);
  const defaultColumnIds = useMemo(() => getDefaultManualRangeVisibleColumnIds(inputColumns), [inputColumns]);
  const canApply = draftColumnIds.length > 0 || draftShowResultColumn;

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftColumnIds(reconcileManualRangeVisibleColumnIds(visibleColumnIds, inputColumns));
    setDraftShowResultColumn(showResultColumn);
  }, [inputColumns, open, showResultColumn, visibleColumnIds]);

  if (!open) {
    return null;
  }

  const toggleColumn = (columnId: string) => {
    setDraftColumnIds((current) => (
      current.includes(columnId)
        ? current.filter((currentColumnId) => currentColumnId !== columnId)
        : [...current, columnId]
    ));
  };
  const apply = () => {
    if (!canApply) {
      return;
    }

    onApply({
      visibleColumnIds: reconcileManualRangeVisibleColumnIds(draftColumnIds, inputColumns),
      showResultColumn: draftShowResultColumn,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Armar columnas"
      className="manualRangeColumnsModal"
      onClose={onClose}
      footer={(
        <div className="manualRangeColumnsActions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary" disabled={!canApply} onClick={apply}>
            Aceptar
          </button>
        </div>
      )}
    >
      <div className="manualRangeColumnsModalBody">
        <p>Elegí qué columnas querés ver en la planilla de rangos. Esto no modifica los datos originales.</p>
        <div className="manualRangeColumnsActions">
          <button type="button" className="secondary sm" onClick={() => setDraftColumnIds(inputColumns.map((column) => column.id))}>
            Seleccionar todas
          </button>
          <button type="button" className="secondary sm" onClick={() => setDraftColumnIds([])}>
            Limpiar
          </button>
          <button type="button" className="secondary sm" onClick={() => setDraftColumnIds(defaultColumnIds)}>
            Restaurar recomendadas
          </button>
        </div>
        <div className="manualRangeColumnsList">
          {inputColumns.map((inputColumn) => (
            <label key={inputColumn.id} className="manualRangeColumnsItem">
              <input
                type="checkbox"
                checked={draftColumnIds.includes(inputColumn.id)}
                onChange={() => toggleColumn(inputColumn.id)}
              />
              <span>{getManualRangeSpreadsheetColumnLabel(inputColumn)}</span>
            </label>
          ))}
          <label className="manualRangeColumnsItem">
            <input
              type="checkbox"
              checked={draftShowResultColumn}
              onChange={(event) => setDraftShowResultColumn(event.target.checked)}
            />
            <span>Mostrar resultado</span>
          </label>
        </div>
        <p className="manualRangeSpreadsheetEmpty">Resultado estimado según los rangos configurados.</p>
        {!canApply ? (
          <p className="manualRangeSpreadsheetEmpty" role="alert">Seleccioná al menos una columna o activá Resultado.</p>
        ) : null}
      </div>
    </Modal>
  );
}
