import type { OutputColumn, ProcessedRow } from '../../types/import';
import { rowsToAoAFromProcessedRows } from './outputModel';

export function exportCsvFromProcessedRows(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
  filename = 'Archivo sanitizado',
) {
  const csv = rowsToAoAFromProcessedRows(rows, outputColumns)
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
