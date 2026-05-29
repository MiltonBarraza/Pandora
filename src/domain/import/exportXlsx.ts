import * as XLSX from 'xlsx';
import type { NormalizedRow, OutputCategory } from '../../types/import';
import { getExportableCategories, rowsToAoA } from './buildOutputRows';

export function exportXlsx(rows: NormalizedRow[], categories: OutputCategory[], filename = 'Archivo sanitizado') {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rowsToAoA(rows, categories));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Salida');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportAuditXlsx(rows: NormalizedRow[], categories: OutputCategory[], filename = 'auditoria') {
  const ordered = getExportableCategories(categories);
  const data = [
    ['Fila', 'Estado', 'Motivo', 'Advertencias', 'Error', ...ordered.map((category) => category.name)],
    ...rows.map((row) => [
      row.rowNumber,
      statusLabel(row),
      row.ignoredReason ?? '',
      row.warnings?.join(' | ') ?? '',
      row.error ?? '',
      ...ordered.map((category) => row.values[category.id] ?? ''),
    ]),
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoria');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function statusLabel(row: NormalizedRow) {
  if (row.status === 'ignored') {
    return row.ignoredReason?.includes('manual') ? 'Ignorada manualmente' : 'Ignorada por regla';
  }

  if (row.status === 'error') {
    return 'Con error';
  }

  return 'Incluida';
}
