import type { CombineOutputColumn, CombinedRow } from '../../types/combine';
import { buildCombinedExportAoA } from './exportCombinedXlsx';

type CombinedCsvInput = {
  outputColumns: CombineOutputColumn[];
  combinedRows: CombinedRow[];
};

type ExportCombinedCsvInput = CombinedCsvInput & {
  fileName: string;
};

export function buildCombinedCsv(input: CombinedCsvInput) {
  return buildCombinedExportAoA(input)
    .map((row) => row.map(escapeCombinedCsvCell).join(','))
    .join('\r\n');
}

export function exportCombinedCsv({
  outputColumns,
  combinedRows,
  fileName,
}: ExportCombinedCsvInput) {
  const csv = buildCombinedCsv({ outputColumns, combinedRows });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${normalizeCombinedCsvFileName(fileName)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function normalizeCombinedCsvFileName(fileName: string) {
  const withoutExtension = fileName.trim().replace(/(?:\.(?:xlsx|csv))+$/i, '').trim();
  return withoutExtension
    .replace(/[\/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Archivo combinado';
}

export function escapeCombinedCsvCell(value: unknown) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
