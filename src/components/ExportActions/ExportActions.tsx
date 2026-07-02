import { useState } from 'react';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
import { shouldDownloadAfterSaveChoice, type SaveBeforeDownloadChoice } from '../../domain/import/settingsBaseline';
import type { FileNameSettings, InputColumn, OutputColumn, ProcessedRow } from '../../types/import';
import type { ProcessedExportResult } from '../../types/processedExport';
import { Modal } from '../Modal/Modal';
import { ActionButton } from '../ui/ActionButton/ActionButton';
import { InfoTooltip } from '../ui/InfoTooltip/InfoTooltip';

type ExportActionsProps = {
  rows: ProcessedRow[];
  auditRows?: ProcessedRow[];
  inputColumns: InputColumn[];
  outputColumns: OutputColumn[];
  fileNameSettings: FileNameSettings;
  sourceFileName: string;
  sheetName: string;
  shouldPromptSaveBeforeExcelDownload?: boolean;
  onSaveSettingsBeforeExcelDownload?: () => boolean | Promise<boolean>;
  onSaveProcessedResult?: (result: ProcessedExportResult) => void;
  onSaveToMultiSheetBatch?: (result: ProcessedExportResult) => void;
};

export function ExportActions({
  rows,
  auditRows = rows,
  inputColumns,
  outputColumns,
  fileNameSettings,
  sourceFileName,
  sheetName,
  shouldPromptSaveBeforeExcelDownload = false,
  onSaveSettingsBeforeExcelDownload,
  onSaveProcessedResult,
  onSaveToMultiSheetBatch,
}: ExportActionsProps) {
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const includedRows = rows.filter((row) => row.status === 'included');
  const filename = buildOutputFileBaseName({ settings: fileNameSettings, sourceFileName, sheetName });
  const auditFilename = buildAuditFileBaseName(filename);
  const hasEnabledOutputColumns = outputColumns.some((column) => column.enabled);

  const downloadExcel = async () => {
    const { exportXlsxFromProcessedRows } = await import('../../domain/import/exportXlsx');
    exportXlsxFromProcessedRows(includedRows, outputColumns, filename);
  };
  const requestExcelDownload = () => {
    if (shouldPromptSaveBeforeExcelDownload && onSaveSettingsBeforeExcelDownload) {
      setIsSavePromptOpen(true);
      return;
    }

    void downloadExcel();
  };
  const resolveSavePrompt = async (choice: SaveBeforeDownloadChoice) => {
    const shouldDownload = await shouldDownloadAfterSaveChoice(
      choice,
      onSaveSettingsBeforeExcelDownload ?? (() => false),
    );
    setIsSavePromptOpen(false);

    if (shouldDownload) {
      await downloadExcel();
    }
  };
  const downloadAudit = async () => {
    const { exportAuditXlsxFromProcessedRows } = await import('../../domain/import/exportXlsx');
    exportAuditXlsxFromProcessedRows(auditRows, outputColumns, auditFilename, inputColumns);
  };
  const emitProcessedResult = (callback: (result: ProcessedExportResult) => void) => {
    callback(createProcessedExportResult({
      rows,
      outputColumns,
      fileBaseName: filename,
      sourceFileName,
      sheetName,
    }));
  };

  return (
    <div className="exportSections">
      <Modal
        open={isSavePromptOpen}
        title="Guardar configuración antes de descargar"
        className="confirmDialogModal"
        onClose={() => setIsSavePromptOpen(false)}
        footer={(
          <div className="confirmDialogActions">
            <ActionButton action="close" variant="secondary" onClick={() => setIsSavePromptOpen(false)}>
              Cancelar
            </ActionButton>
            <ActionButton action="download" variant="secondary" onClick={() => void resolveSavePrompt('skip')}>
              Descargar sin guardar
            </ActionButton>
            <ActionButton action="export" onClick={() => void resolveSavePrompt('save')} autoFocus>
              Guardar configuración
            </ActionButton>
          </div>
        )}
      >
        <p className="confirmDialogMessage">Hay cambios de configuración que todavía no guardaste.</p>
      </Modal>
      <div className="exportBlock">
        <div>
          <strong className="headingWithInfo">
            <span>Archivo final</span>
            <InfoTooltip content="Contiene solo las filas incluidas y columnas configuradas." />
          </strong>
          <p className="muted">Descarga el resultado procesado con el mismo nombre base.</p>
          {onSaveProcessedResult ? (
            <p className="muted">Guarda este resultado en una bolsa temporal para combinarlo con otros archivos.</p>
          ) : null}
          {onSaveToMultiSheetBatch ? (
            <p className="muted">Guarda esta hoja en un lote multi-hoja. Todas las hojas del lote deben tener las mismas columnas de salida.</p>
          ) : null}
        </div>
        <div className="actions">
          <ActionButton action="download" disabled={includedRows.length === 0} onClick={requestExcelDownload}>
            Descargar Excel
          </ActionButton>
          <ActionButton action="download" variant="secondary" disabled={includedRows.length === 0} onClick={() => exportCsvFromProcessedRows(includedRows, outputColumns, filename)}>
            Descargar CSV
          </ActionButton>
          {onSaveProcessedResult ? (
            <ActionButton
              action="save"
              variant="secondary"
              disabled={includedRows.length === 0 || !hasEnabledOutputColumns}
              onClick={() => emitProcessedResult(onSaveProcessedResult)}
            >
              Guardar para combinar
            </ActionButton>
          ) : null}
          {onSaveToMultiSheetBatch ? (
            <ActionButton
              action="save"
              variant="secondary"
              disabled={includedRows.length === 0 || !hasEnabledOutputColumns}
              onClick={() => emitProcessedResult(onSaveToMultiSheetBatch)}
            >
              Guardar hoja en lote
            </ActionButton>
          ) : null}
        </div>
      </div>
      <div className="exportBlock secondaryExportBlock">
        <div>
          <strong className="headingWithInfo">
            <span>Control y revisión</span>
            <InfoTooltip content="Sirve para revisar filas excluidas, errores y advertencias." />
          </strong>
          <p className="muted">Descarga un archivo de auditoría con filas procesadas, excluidas, advertencias y errores.</p>
          <p className="muted exportFileName">Archivo: {auditFilename}.xlsx</p>
        </div>
        <div className="actions">
          <ActionButton action="download" variant="secondary" disabled={auditRows.length === 0} onClick={() => void downloadAudit()}>
            Descargar auditoría
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function createProcessedExportResult({
  rows,
  outputColumns,
  fileBaseName,
  sourceFileName,
  sheetName,
}: {
  rows: ProcessedRow[];
  outputColumns: OutputColumn[];
  fileBaseName: string;
  sourceFileName?: string;
  sheetName?: string;
}): ProcessedExportResult {
  return {
    id: createProcessedExportId(),
    fileBaseName,
    sourceFileName: sourceFileName || undefined,
    sheetName: sheetName || undefined,
    columns: outputColumns.map(({ id, label, order, enabled }) => ({ id, label, order, enabled })),
    rows: rows
      .filter((row) => row.status === 'included')
      .map((row) => ({
        status: 'included',
        outputValues: { ...row.outputValues },
      })),
  };
}

function createProcessedExportId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `processed-export:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
