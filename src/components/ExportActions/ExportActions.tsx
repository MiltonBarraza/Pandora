import { exportCsv } from '../../domain/import/exportCsv';
import { exportAuditXlsx, exportXlsx } from '../../domain/import/exportXlsx';
import { buildAuditFileBaseName, buildOutputFileBaseName } from '../../domain/import/downloadNames';
import type { FileNameSettings, NormalizedRow, OutputCategory } from '../../types/import';

type ExportActionsProps = {
  rows: NormalizedRow[];
  categories: OutputCategory[];
  fileNameSettings: FileNameSettings;
  sourceFileName: string;
  sheetName: string;
};

export function ExportActions({ rows, categories, fileNameSettings, sourceFileName, sheetName }: ExportActionsProps) {
  const includedRows = rows.filter((row) => row.status === 'included');
  const filename = buildOutputFileBaseName({ settings: fileNameSettings, sourceFileName, sheetName });
  const auditFilename = buildAuditFileBaseName(filename);

  return (
    <div className="actions">
      <button type="button" disabled={includedRows.length === 0} onClick={() => exportXlsx(includedRows, categories, filename)}>
        Descargar Excel
      </button>
      <button type="button" className="secondary" disabled={includedRows.length === 0} onClick={() => exportCsv(includedRows, categories, filename)}>
        Descargar CSV
      </button>
      <button type="button" className="secondary" disabled={rows.length === 0} onClick={() => exportAuditXlsx(rows, categories, auditFilename)}>
        Descargar auditoria
      </button>
    </div>
  );
}
