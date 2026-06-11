import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
import { exportAuditXlsxFromProcessedRows, exportXlsxFromProcessedRows } from '../../domain/import/exportXlsx';
import type { FileNameSettings, InputColumn, OutputColumn, ProcessedRow } from '../../types/import';
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
};

export function ExportActions({ rows, auditRows = rows, inputColumns, outputColumns, fileNameSettings, sourceFileName, sheetName }: ExportActionsProps) {
  const includedRows = rows.filter((row) => row.status === 'included');
  const filename = buildOutputFileBaseName({ settings: fileNameSettings, sourceFileName, sheetName });
  const auditFilename = buildAuditFileBaseName(filename);

  return (
    <div className="exportSections">
      <div className="exportBlock">
        <div>
          <strong className="headingWithInfo">
            <span>Archivo final</span>
            <InfoTooltip content="Contiene solo las filas incluidas y columnas configuradas." />
          </strong>
          <p className="muted">Descarga el resultado procesado con el mismo nombre base.</p>
        </div>
        <div className="actions">
          <ActionButton action="download" disabled={includedRows.length === 0} onClick={() => exportXlsxFromProcessedRows(includedRows, outputColumns, filename)}>
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
