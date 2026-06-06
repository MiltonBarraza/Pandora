import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
import { exportAuditXlsxFromProcessedRows, exportXlsxFromProcessedRows } from '../../domain/import/exportXlsx';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import type { FileNameSettings, InputColumn, OutputColumn, ProcessedRow } from '../../types/import';
import { ActionButton } from '../ui/ActionButton/ActionButton';

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
    <div className="actions">
      <ActionButton action="download" disabled={includedRows.length === 0} onClick={() => exportXlsxFromProcessedRows(includedRows, outputColumns, filename)}>
        Descargar Excel
      </ActionButton>
      <ActionButton action="download" variant="secondary" disabled={includedRows.length === 0} onClick={() => exportCsvFromProcessedRows(includedRows, outputColumns, filename)}>
        Descargar CSV
      </ActionButton>
      <ActionButton action="download" variant="secondary" disabled={auditRows.length === 0} onClick={() => exportAuditXlsxFromProcessedRows(auditRows, outputColumns, auditFilename, inputColumns)}>
        Descargar auditoria
      </ActionButton>
    </div>
  );
}
