import { useState } from 'react';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
import { exportAuditXlsxFromProcessedRows, exportXlsxFromProcessedRows } from '../../domain/import/exportXlsx';
import { shouldDownloadAfterSaveChoice, type SaveBeforeDownloadChoice } from '../../domain/import/settingsBaseline';
import type { FileNameSettings, InputColumn, OutputColumn, ProcessedRow } from '../../types/import';
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
}: ExportActionsProps) {
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const includedRows = rows.filter((row) => row.status === 'included');
  const filename = buildOutputFileBaseName({ settings: fileNameSettings, sourceFileName, sheetName });
  const auditFilename = buildAuditFileBaseName(filename);

  const downloadExcel = () => {
    exportXlsxFromProcessedRows(includedRows, outputColumns, filename);
  };
  const requestExcelDownload = () => {
    if (shouldPromptSaveBeforeExcelDownload && onSaveSettingsBeforeExcelDownload) {
      setIsSavePromptOpen(true);
      return;
    }

    downloadExcel();
  };
  const resolveSavePrompt = async (choice: SaveBeforeDownloadChoice) => {
    const shouldDownload = await shouldDownloadAfterSaveChoice(
      choice,
      onSaveSettingsBeforeExcelDownload ?? (() => false),
    );
    setIsSavePromptOpen(false);

    if (shouldDownload) {
      downloadExcel();
    }
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
        </div>
        <div className="actions">
          <ActionButton action="download" disabled={includedRows.length === 0} onClick={requestExcelDownload}>
            Descargar Excel
          </ActionButton>
          <ActionButton action="download" variant="secondary" disabled={includedRows.length === 0} onClick={() => exportCsvFromProcessedRows(includedRows, outputColumns, filename)}>
            Descargar CSV
          </ActionButton>
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
          <ActionButton action="download" variant="secondary" disabled={auditRows.length === 0} onClick={() => exportAuditXlsxFromProcessedRows(auditRows, outputColumns, auditFilename, inputColumns)}>
            Descargar auditoría
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
