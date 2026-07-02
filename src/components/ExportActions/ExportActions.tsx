import { useState } from 'react';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
import { createProcessedExportResult, getProcessedExportAvailability } from '../../domain/import/processedExportResult';
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
  const saveAvailability = getProcessedExportAvailability(rows, outputColumns);

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
          <p className="muted">Descargá el resultado procesado o guardalo para reutilizarlo.</p>
          {onSaveProcessedResult ? (
            <p className="muted exportActionHint">“Guardar para combinar” lo deja disponible en Combinar archivos.</p>
          ) : null}
          {onSaveToMultiSheetBatch ? (
            <p className="muted exportActionHint">“Guardar hoja en lote” exige las mismas columnas de salida en todas las hojas.</p>
          ) : null}
        </div>
        <div className="exportActionGroups">
          <div className="actions exportDownloadActions">
            <ActionButton action="download" disabled={includedRows.length === 0} onClick={requestExcelDownload}>
              Descargar Excel
            </ActionButton>
            <ActionButton action="download" variant="secondary" disabled={includedRows.length === 0} onClick={() => exportCsvFromProcessedRows(includedRows, outputColumns, filename)}>
              Descargar CSV
            </ActionButton>
          </div>
          {onSaveProcessedResult || onSaveToMultiSheetBatch ? (
            <div className="actions exportSaveActions">
              {onSaveProcessedResult ? (
                <ActionButton
                  action="save"
                  variant="secondary"
                  disabled={!saveAvailability.exportable}
                  onClick={() => emitProcessedResult(onSaveProcessedResult)}
                >
                  Guardar para combinar
                </ActionButton>
              ) : null}
              {onSaveToMultiSheetBatch ? (
                <ActionButton
                  action="save"
                  variant="secondary"
                  disabled={!saveAvailability.exportable}
                  onClick={() => emitProcessedResult(onSaveToMultiSheetBatch)}
                >
                  Guardar hoja en lote
                </ActionButton>
              ) : null}
            </div>
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
