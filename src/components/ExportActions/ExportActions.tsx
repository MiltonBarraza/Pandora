import { exportCsvFromProcessedRows } from '../../domain/import/exportCsv';
import { exportAuditXlsxFromProcessedRows, exportXlsxFromProcessedRows } from '../../domain/import/exportXlsx';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import type { FileNameSettings, OutputColumn, ProcessedRow } from '../../types/import';

type ExportActionsProps = {
  rows: ProcessedRow[];
  outputColumns: OutputColumn[];
  fileNameSettings: FileNameSettings;
  sourceFileName: string;
  sheetName: string;
};

export function ExportActions({ rows, outputColumns, fileNameSettings, sourceFileName, sheetName }: ExportActionsProps) {
  const includedRows = rows.filter((row) => row.status === 'included');
  const filename = buildOutputFileBaseName({ settings: fileNameSettings, sourceFileName, sheetName });
  const auditFilename = buildAuditFileBaseName(filename);

  return (
    <div className="actions">
      <button type="button" disabled={includedRows.length === 0} onClick={() => exportXlsxFromProcessedRows(includedRows, outputColumns, filename)}>
        Descargar Excel
      </button>
      <button type="button" className="secondary" disabled={includedRows.length === 0} onClick={() => exportCsvFromProcessedRows(includedRows, outputColumns, filename)}>
        Descargar CSV
      </button>
      <button type="button" className="secondary" disabled={rows.length === 0} onClick={() => exportAuditXlsxFromProcessedRows(rows, outputColumns, auditFilename)}>
        Descargar auditoria
      </button>
    </div>
  );
}
