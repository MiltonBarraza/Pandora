import { useState } from 'react';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
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
  onSaveForCombine?: () => void;
  saveForCombineDisabled?: boolean;
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
  onSaveForCombine,
  saveForCombineDisabled = false,
}: ExportActionsProps) {
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const includedRows = rows.filter((row) => row.status === 'included');
  const filename = buildOutputFileBaseName({ settings: fileNameSettings, sourceFileName, sheetName });
  const auditFilename = buildAuditFileBaseName(filename);

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
            <span>Descargar archivo final</span>
            <InfoTooltip content="Contiene solo las filas incluidas y columnas configuradas." />
          </strong>
          <p className="muted">Descargá el resultado procesado en el formato que necesites.</p>
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
        </div>
      </div>
      {onSaveForCombine ? (
        <div className="exportBlock combineExportBlock">
          <div>
            <strong>Guardar para combinar</strong>
            <p className="muted">Guardá este resultado para usarlo luego en Combinar archivos junto con otros archivos preparados.</p>
          </div>
          <div className="actions">
            <ActionButton
              action="save"
              variant="secondary"
              disabled={saveForCombineDisabled}
              onClick={onSaveForCombine}
            >
              Guardar para combinar
            </ActionButton>
          </div>
        </div>
      ) : null}
      <div className="exportBlock secondaryExportBlock">
        <div>
          <strong className="headingWithInfo">
            <span>Control y revisión</span>
            <InfoTooltip content="Sirve para revisar filas excluidas, errores y advertencias." />
          </strong>
          <p className="muted">Descargá un archivo de auditoría con filas procesadas, excluidas, advertencias y errores.</p>
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
