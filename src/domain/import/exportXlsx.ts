import * as XLSX from 'xlsx';
import type { OutputColumn, ProcessedRow } from '../../types/import';
import { getEnabledOutputColumns, rowsToAoAFromProcessedRows } from './outputModel';

export function exportXlsxFromProcessedRows(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
  filename = 'Archivo sanitizado',
) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rowsToAoAFromProcessedRows(rows, outputColumns));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Salida');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportAuditXlsxFromProcessedRows(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
  filename = 'auditoria',
) {
  const ordered = getEnabledOutputColumns(outputColumns);
  const data = [
    ['Fila', 'Estado', 'Motivo', 'Advertencias', 'Error', ...ordered.map((column) => column.label)],
    ...rows.map((row) => [
      row.rowNumber,
      processedStatusLabel(row),
      row.ignoredReason ?? '',
      row.warnings?.join(' | ') ?? '',
      row.error ?? '',
      ...ordered.map((column) => row.outputValues[column.id] ?? ''),
    ]),
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoria');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function processedStatusLabel(row: ProcessedRow) {
  if (row.status === 'ignored') {
    return row.ignoredReason?.includes('manual') ? 'Ignorada manualmente' : 'Ignorada por regla';
  }

  if (row.status === 'error') {
    return 'Con error';
  }

  return 'Incluida';
}
