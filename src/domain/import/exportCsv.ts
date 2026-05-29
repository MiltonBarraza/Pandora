import type { NormalizedRow, OutputCategory } from '../../types/import';
import { rowsToAoA } from './buildOutputRows';

export function exportCsv(rows: NormalizedRow[], categories: OutputCategory[], filename = 'Archivo sanitizado') {
  const csv = rowsToAoA(rows, categories)
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
