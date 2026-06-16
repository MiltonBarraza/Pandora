import * as XLSX from 'xlsx';
import type { RawRow, SheetRowsWithMetadata } from '../../types/import';

export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  return getSheetRowsWithMetadata(workbook, sheetName).rows;
}

export function getSheetRowsWithMetadata(workbook: XLSX.WorkBook, sheetName: string): SheetRowsWithMetadata {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) {
    return { rows: [], rowMetadata: [] };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const rows: RawRow[] = [];
  const rowMetadata: SheetRowsWithMetadata['rowMetadata'] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: RawRow = [];

    for (let columnIndex = 0; columnIndex <= range.e.c; columnIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = sheet[cellAddress];
      row[columnIndex] = cell ? formatSheetCell(cell) : '';
    }

    if (row.some((cell) => String(cell ?? '').trim() !== '')) {
      rowMetadata.push({
        internalRowIndex: rows.length,
        excelRowNumber: rowIndex + 1,
      });
      rows.push(row);
    }
  }

  return { rows, rowMetadata };
}

export function getSheetPreview(rows: RawRow[], limit = 12): RawRow[] {
  return rows.slice(0, limit);
}

function formatSheetCell(cell: XLSX.CellObject) {
  const dateParts = getCellDateParts(cell);
  if (dateParts) {
    return `${dateParts.day}/${dateParts.month}/${dateParts.year}`;
  }

  return XLSX.utils.format_cell(cell);
}

function getCellDateParts(cell: XLSX.CellObject) {
  if (cell.t === 'd' && cell.v instanceof Date && !Number.isNaN(cell.v.getTime())) {
    return {
      year: cell.v.getUTCFullYear(),
      month: cell.v.getUTCMonth() + 1,
      day: cell.v.getUTCDate(),
    };
  }

  if (cell.t === 'n' && typeof cell.v === 'number' && isDateFormat(getCellFormat(cell.z))) {
    const parsed = XLSX.SSF.parse_date_code(cell.v);
    if (parsed) {
      return {
        year: parsed.y,
        month: parsed.m,
        day: parsed.d,
      };
    }
  }

  return null;
}

function getCellFormat(format: XLSX.CellObject['z']) {
  if (typeof format === 'number') {
    return XLSX.SSF._table[format];
  }

  return format;
}

function isDateFormat(format: string | undefined) {
  if (!format) {
    return false;
  }

  const normalized = format
    .replace(/\[[^\]]+\]/g, '')
    .replace(/"[^"]*"/g, '')
    .toLowerCase();

  return /[dmy]/.test(normalized) && /[dy]/.test(normalized);
}
