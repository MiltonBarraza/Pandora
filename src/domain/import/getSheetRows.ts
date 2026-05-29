import * as XLSX from 'xlsx';
import type { RawRow } from '../../types/import';

export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) {
    return [];
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const rows: RawRow[] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: RawRow = [];

    for (let columnIndex = 0; columnIndex <= range.e.c; columnIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = sheet[cellAddress];
      row[columnIndex] = cell ? XLSX.utils.format_cell(cell) : '';
    }

    if (row.some((cell) => String(cell ?? '').trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export function getSheetPreview(rows: RawRow[], limit = 12): RawRow[] {
  return rows.slice(0, limit);
}
