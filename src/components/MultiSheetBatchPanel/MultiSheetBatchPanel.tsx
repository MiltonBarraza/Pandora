import { useState } from 'react';
import type { MultiSheetBatch } from '../../types/multiSheet';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { ConfirmDialog } from '../ui/ConfirmDialog/ConfirmDialog';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type MultiSheetBatchPanelProps = {
  batch: MultiSheetBatch;
  onRemoveSheet: (sheetId: string) => void;
  onClear: () => void;
  onExport: () => void;
  onSaveCurrentSheet?: () => void;
  saveCurrentSheetDisabled?: boolean;
  saveCurrentSheetDisabledReason?: string;
};

export function MultiSheetBatchPanel({
  batch,
  onRemoveSheet,
  onClear,
  onExport,
  onSaveCurrentSheet,
  saveCurrentSheetDisabled = false,
  saveCurrentSheetDisabledReason = '',
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
        <div className="multiSheetBatchTitleBlock">
          <div className="multiSheetBatchTitleRow">
            <h3 id="multi-sheet-batch-title">Lote multi-hoja</h3>
            <InfoTooltip
              ariaLabel="Información sobre el lote multi-hoja"
              placement="right"
              content="Guardá varias hojas compatibles del mismo archivo para exportarlas juntas. El lote multi-hoja es temporal y se pierde al recargar la página."
            />
          </div>
          {hasSheets ? (
            <>
              {batch.fileName ? (
                <p className="multiSheetBatchFileName">
                  <span>Nombre de archivo:</span> {batch.fileName}
                </p>
              ) : null}
              <div className="multiSheetBatchSummary">
                <span className="visuallyHidden">
                  {batch.sheets.length} {batch.sheets.length === 1 ? 'hoja' : 'hojas'} · {totalRows} filas · {columnCount} columnas
                </span>
                <span className="multiSheetBatchSummaryLabel" aria-hidden="true">Total:</span>
                <span className="multiSheetBatchSummaryChip" aria-hidden="true"><strong>{batch.sheets.length}</strong> {batch.sheets.length === 1 ? 'hoja' : 'hojas'}</span>
                <span className="multiSheetBatchSummaryChip" aria-hidden="true"><strong>{totalRows}</strong> filas</span>
                <span className="multiSheetBatchSummaryChip" aria-hidden="true"><strong>{columnCount}</strong> columnas</span>
              </div>
            </>
          ) : (
            <div className="multiSheetBatchEmptyCopy">
              <p className="muted">Todavía no guardaste hojas en el lote.</p>
              <span className="muted">Usá “Guardar hoja en lote” al finalizar una hoja.</span>
            </div>
          )}
        </div>
        <div className="actions">
          {onSaveCurrentSheet ? (
            <InfoTooltip
              placement="bottom"
              content={saveCurrentSheetDisabled
                ? saveCurrentSheetDisabledReason
                : 'Guarda la hoja actual en el lote multi-hoja para exportarla junto con otras hojas compatibles.'}
            >
              <ActionButton
                action="save"
                variant="secondary"
                disabled={saveCurrentSheetDisabled}
                onClick={onSaveCurrentSheet}
              >
                Guardar hoja en lote
              </ActionButton>
            </InfoTooltip>
          ) : null}
          <ActionButton action="delete" variant="secondary" disabled={!hasSheets} onClick={() => setIsClearConfirmationOpen(true)}>
            Limpiar lote
          </ActionButton>
          <InfoTooltip
            placement="bottom"
            content="Exporta en un solo archivo Excel todas las hojas guardadas en el lote multi-hoja."
          >
            <ActionButton action="export" disabled={!hasSheets} onClick={onExport}>
              Exportar lote combinado
            </ActionButton>
          </InfoTooltip>
        </div>
      </div>

      {hasSheets ? (
        <div className="multiSheetBatchSheets">
          {batch.sheets.map((sheet) => (
            <div className="multiSheetBatchSheet" key={sheet.id}>
              <div>
                <strong>Hoja: {sheet.sheetName || 'Sin nombre'}</strong>
                <span className="muted multiSheetBatchSheetMeta">
                  Filas de la hoja: {sheet.rowCount} <span className="multiSheetBatchSheetStatus">Lista para exportar</span>
                </span>
              </div>
              <InfoTooltip
                placement="left"
                content="Remover"
              >
                <ActionButton
                  action="delete"
                  variant="danger"
                  size="sm"
                  aria-label={`Remover ${sheet.sheetName || 'hoja sin nombre'}`}
                  onClick={() => onRemoveSheet(sheet.id)}
                />
              </InfoTooltip>
            </div>
          ))}
        </div>
      ) : null}

    </section>
  );
}
