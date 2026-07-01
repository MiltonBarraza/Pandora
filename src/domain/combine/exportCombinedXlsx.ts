import * as XLSX from 'xlsx';
import type { CombineOutputColumn, CombinedRow } from '../../types/combine';

type CombinedExportInput = {
  outputColumns: CombineOutputColumn[];
  combinedRows: CombinedRow[];
};

type ExportCombinedXlsxInput = CombinedExportInput & {
  fileName: string;
};

export function buildCombinedExportAoA({
  outputColumns,
  combinedRows,
}: CombinedExportInput): string[][] {
  return [
    outputColumns.map((column) => column.name.trim() || 'Columna sin nombre'),
    ...combinedRows.map((row) => outputColumns.map((column) => row.values[column.id] ?? '')),
  ];
}

export function exportCombinedXlsx({
  outputColumns,
  combinedRows,
  fileName,
}: ExportCombinedXlsxInput) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(buildCombinedExportAoA({ outputColumns, combinedRows }));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Combinado');
  XLSX.writeFile(workbook, `${normalizeCombinedFileName(fileName)}.xlsx`);
}

export function normalizeCombinedFileName(fileName: string) {
  return fileName.trim().replace(/\.xlsx$/i, '').trim() || 'Archivo combinado';
}
