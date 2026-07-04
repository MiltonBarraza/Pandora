import * as XLSX from 'xlsx';
import type { InputColumn, OutputColumn, ProcessedRow } from '../../types/import';
import { getInputColumnLabel } from './inputColumnLabels';
import { getEnabledOutputColumns, rowsToAoAFromProcessedRows } from './outputModel';

export function exportXlsxFromProcessedRows(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
  filename = 'Archivo sanitizado',
) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rowsToAoAFromProcessedRows(rows, outputColumns));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Hoja sanitizada');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportAuditXlsxFromProcessedRows(
  rows: ProcessedRow[],
  outputColumns: OutputColumn[],
  filename = 'auditoría',
  inputColumns: InputColumn[] = [],
) {
  const ordered = getEnabledOutputColumns(outputColumns);
  const activeInputColumns = inputColumns.filter((column) => column.active);
  const data = [
    [
      'Fila',
      'Estado',
      'Motivo',
      'Advertencias',
      'Error',
      ...activeInputColumns.map((column) => `Entrada: ${getInputColumnLabel(column)}`),
      ...ordered.map((column) => column.label),
    ],
    ...rows.map((row) => [
      row.rowNumber,
      processedStatusLabel(row),
      row.ignoredReason ?? '',
      row.warnings?.join(' | ') ?? '',
      row.error ?? '',
      ...activeInputColumns.map((column) => row.inputValues[column.id] ?? ''),
      ...ordered.map((column) => row.outputValues[column.id] ?? ''),
    ]),
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoría');
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
