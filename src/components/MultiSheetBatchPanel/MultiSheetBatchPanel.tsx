import { useState } from 'react';
import type { MultiSheetBatch } from '../../types/multiSheet';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';

type MultiSheetBatchPanelProps = {
  batch: MultiSheetBatch;
  onRemoveSheet: (sheetId: string) => void;
  onClear: () => void;
  onExport: () => void;
};

export function MultiSheetBatchPanel({
  batch,
  onRemoveSheet,
  onClear,
  onExport,
}: MultiSheetBatchPanelProps) {
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
  const totalRows = batch.sheets.reduce((total, sheet) => total + sheet.rowCount, 0);
  const columnCount = batch.outputSchema?.columns.length ?? 0;
  const hasSheets = batch.sheets.length > 0;

  return (
    <section className={`panel multiSheetBatchPanel${hasSheets ? '' : ' multiSheetBatchPanelEmpty'}`} aria-labelledby="multi-sheet-batch-title">
      <ConfirmDialog
        open={isClearConfirmationOpen}
        title="Limpiar lote multi-hoja"
        message="Se quitarán todas las hojas guardadas en el lote. Esta acción no modifica el archivo ni la configuración actual."
        confirmLabel="Limpiar lote"
        variant="danger"
        onCancel={() => setIsClearConfirmationOpen(false)}
        onConfirm={() => {
          setIsClearConfirmationOpen(false);
          onClear();
        }}
      />
      <div className="multiSheetBatchHeader">
        <div>
          <h2 id="multi-sheet-batch-title">Lote multi-hoja</h2>
          {hasSheets ? (
            <p className="muted multiSheetBatchSummary">
              {batch.fileName ? <><strong>{batch.fileName}</strong> · </> : null}
              {batch.sheets.length} {batch.sheets.length === 1 ? 'hoja' : 'hojas'} · {totalRows} filas · {columnCount} columnas
            </p>
          ) : (
            <p className="muted">Todavía no guardaste hojas en el lote.</p>
          )}
        </div>
        <div className="actions">
          <ActionButton action="delete" variant="secondary" disabled={!hasSheets} onClick={() => setIsClearConfirmationOpen(true)}>
            Limpiar lote
          </ActionButton>
          <ActionButton action="export" disabled={!hasSheets} onClick={onExport}>
            Exportar lote combinado
          </ActionButton>
        </div>
      </div>

      {hasSheets ? (
        <div className="multiSheetBatchSheets">
          {batch.sheets.map((sheet) => (
            <div className="multiSheetBatchSheet" key={sheet.id}>
              <div>
                <strong>{sheet.sheetName || 'Hoja sin nombre'}</strong>
                <span className="muted">{sheet.rowCount} filas · Configurada</span>
              </div>
              <ActionButton
                action="delete"
                variant="ghost"
                size="sm"
                aria-label={`Remover ${sheet.sheetName || 'hoja sin nombre'}`}
                onClick={() => onRemoveSheet(sheet.id)}
              >
                Remover
              </ActionButton>
            </div>
          ))}
        </div>
      ) : null}

      <p className="muted multiSheetBatchTemporaryNotice">
        El lote multi-hoja es temporal y se pierde al recargar la página.
      </p>
    </section>
  );
}
