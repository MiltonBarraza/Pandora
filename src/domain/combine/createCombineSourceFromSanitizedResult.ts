import type { CombineSource } from '../../types/combine';
import type { ProcessedExportResult } from '../../types/processedExport';

export function createCombineSourceFromSanitizedResult(
  result: ProcessedExportResult,
): CombineSource {
  const enabledColumns = [...result.columns]
    .filter((column) => column.enabled)
    .sort((left, right) => left.order - right.order);
  const columns = enabledColumns.map((column, index) => ({
    id: `col:${index}`,
    name: column.label.trim() || `Columna ${index + 1}`,
    index,
  }));
  const includedRows = result.rows.filter((row) => row.status === 'included');

  return {
    id: result.id,
    fileName: buildXlsxFileName(result.fileBaseName),
    sheetName: result.sheetName,
    columns,
    rows: includedRows.map((row, rowIndex) => ({
      id: `row:${rowIndex}`,
      values: Object.fromEntries(enabledColumns.map((column, columnIndex) => [
        `col:${columnIndex}`,
        row.outputValues[column.id] ?? '',
      ])),
    })),
  };
}

function buildXlsxFileName(fileBaseName: string) {
  const baseName = fileBaseName.trim().replace(/(\.xlsx)+$/i, '').trim();
  return `${baseName || 'Archivo preparado'}.xlsx`;
}
