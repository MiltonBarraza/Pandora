import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { InputColumn } from '../../types/import';
import { Modal } from '../Modal/Modal';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';
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

const manualRangeColumnsHelpText = 'Elegí qué columnas querés ver en la planilla de rangos. Esto no modifica los datos originales.';
const manualRangeResultHelpText = 'Resultado estimado según los rangos configurados.';

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

  const { availableColumns, visibleColumns } = getManualRangeColumnsTransferState(inputColumns, draftColumnIds);
  const showColumn = (columnId: string) => setDraftColumnIds((current) => addManualRangeVisibleColumn(current, columnId, inputColumns));
  const hideColumn = (columnId: string) => setDraftColumnIds((current) => removeManualRangeVisibleColumn(current, columnId));
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
      headerDetails={<span>{manualRangeColumnsHelpText}</span>}
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
        <div className="manualRangeColumnsToolbar">
          <label className="checkboxField manualRangeColumnsResultToggle">
            <input
              type="checkbox"
              checked={draftShowResultColumn}
              onChange={(event) => setDraftShowResultColumn(event.target.checked)}
            />
            <span>Mostrar resultado</span>
            <InfoTooltip ariaLabel="Ayuda: mostrar resultado" content={manualRangeResultHelpText} />
          </label>
          <div className="manualRangeColumnsActions">
            <button type="button" className="secondary sm" onClick={() => setDraftColumnIds(showAllManualRangeColumns(inputColumns))}>
              Mostrar todas
            </button>
            <button type="button" className="secondary sm" onClick={() => setDraftColumnIds(hideAllManualRangeColumns())}>
              Ocultar todas
            </button>
            <button type="button" className="secondary sm" onClick={() => setDraftColumnIds(defaultColumnIds)}>
              Restaurar recomendadas
            </button>
          </div>
        </div>
        <div className="columnTransferGrid manualRangeColumnsTransferGrid">
          <ManualRangeColumnsTransferPanel title="Disponibles" count={availableColumns.length} emptyMessage="No hay columnas disponibles.">
            {availableColumns.map((inputColumn) => (
              <ManualRangeColumnsTransferItem
                key={inputColumn.id}
                inputColumn={inputColumn}
                actionLabel="Mostrar"
                actionAriaLabel={`Mostrar columna ${getManualRangeSpreadsheetColumnLabel(inputColumn)}`}
                onAction={() => showColumn(inputColumn.id)}
              />
            ))}
          </ManualRangeColumnsTransferPanel>
          <ManualRangeColumnsTransferPanel title="Visibles" count={visibleColumns.length} emptyMessage="No hay columnas visibles.">
            {visibleColumns.map((inputColumn) => (
              <ManualRangeColumnsTransferItem
                key={inputColumn.id}
                inputColumn={inputColumn}
                actionLabel="Ocultar"
                actionAriaLabel={`Ocultar columna ${getManualRangeSpreadsheetColumnLabel(inputColumn)}`}
                onAction={() => hideColumn(inputColumn.id)}
              />
            ))}
          </ManualRangeColumnsTransferPanel>
        </div>
        {!canApply ? (
          <p className="manualRangeSpreadsheetEmpty" role="alert">Seleccioná al menos una columna o activá Resultado.</p>
        ) : null}
      </div>
    </Modal>
  );
}

function ManualRangeColumnsTransferPanel({
  title,
  count,
  emptyMessage,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <section className="columnTransferPanel manualRangeColumnsTransferPanel" aria-label={title}>
      <div className="columnTransferPanelHeader">
        <h3>{title} <span>({count})</span></h3>
      </div>
      {count > 0 ? (
        <div className="columnTransferList manualRangeColumnsTransferList">{children}</div>
      ) : (
        <p className="columnTransferEmpty">{emptyMessage}</p>
      )}
    </section>
  );
}

function ManualRangeColumnsTransferItem({
  inputColumn,
  actionLabel,
  actionAriaLabel,
  onAction,
}: {
  inputColumn: InputColumn;
  actionLabel: string;
  actionAriaLabel: string;
  onAction: () => void;
}) {
  const label = getManualRangeSpreadsheetColumnLabel(inputColumn);

  return (
    <article className="columnTransferItem manualRangeColumnsTransferItem">
      <div className="columnTransferSelectArea manualRangeColumnsTransferItemMain">
        <div className="columnTransferTitleRow">
          <strong>{label}</strong>
        </div>
        <div className="columnTransferMeta">
          <span>Columna {inputColumn.columnLetter || inputColumn.columnIndex + 1}</span>
        </div>
      </div>
      <div className="columnTransferActions">
        <button type="button" className="secondary columnTransferAction" aria-label={actionAriaLabel} onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </article>
  );
}

export function getManualRangeColumnsTransferState(inputColumns: InputColumn[], visibleColumnIds: string[]) {
  const visibleColumnIdSet = new Set(reconcileManualRangeVisibleColumnIds(visibleColumnIds, inputColumns));
  return {
    availableColumns: inputColumns.filter((inputColumn) => !visibleColumnIdSet.has(inputColumn.id)),
    visibleColumns: inputColumns.filter((inputColumn) => visibleColumnIdSet.has(inputColumn.id)),
  };
}

export function addManualRangeVisibleColumn(currentColumnIds: string[], columnId: string, inputColumns: InputColumn[]) {
  return reconcileManualRangeVisibleColumnIds([...currentColumnIds, columnId], inputColumns);
}

export function removeManualRangeVisibleColumn(currentColumnIds: string[], columnId: string) {
  return currentColumnIds.filter((currentColumnId) => currentColumnId !== columnId);
}

export function showAllManualRangeColumns(inputColumns: InputColumn[]) {
  return inputColumns.map((inputColumn) => inputColumn.id);
}

export function hideAllManualRangeColumns() {
  return [];
}

