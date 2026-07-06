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

  const { range, rangeMetadata } = getEffectiveSheetRange(sheet);
  const rows: RawRow[] = [];
  const rowMetadata: SheetRowsWithMetadata['rowMetadata'] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: RawRow = [];
    let rowHasUsefulCell = false;

    for (let columnIndex = 0; columnIndex <= range.e.c; columnIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = sheet[cellAddress];
      rowHasUsefulCell ||= isUsefulCell(cell);
      row[columnIndex] = cell ? formatSheetCell(cell) : '';
    }

    if (rowHasUsefulCell) {
      rowMetadata.push({
        internalRowIndex: rows.length,
        excelRowNumber: rowIndex + 1,
      });
      rows.push(row);
    }
  }

  return { rows, rowMetadata, rangeMetadata };
}

function getEffectiveSheetRange(sheet: XLSX.WorkSheet) {
  const originalRef = sheet['!ref'] as string;
  const originalRange = XLSX.utils.decode_range(originalRef);
  let lastUsefulRow = 0;
  let lastUsefulColumn = 0;
  let foundUsefulCell = false;

  for (const address in sheet) {
    const cell = sheet[address] as XLSX.CellObject;
    if (address.startsWith('!') || !isCellAddress(address) || !isUsefulCell(cell)) {
      continue;
    }

    const position = XLSX.utils.decode_cell(address);
    foundUsefulCell = true;
    lastUsefulRow = Math.max(lastUsefulRow, position.r);
    lastUsefulColumn = Math.max(lastUsefulColumn, position.c);
  }

  const range = {
    s: foundUsefulCell ? originalRange.s : { r: 0, c: 0 },
    e: { r: lastUsefulRow, c: lastUsefulColumn },
  };
  const ignoredTrailingColumns = Math.max(0, originalRange.e.c - range.e.c);
  const ignoredTrailingRows = Math.max(0, originalRange.e.r - range.e.r);
  const shouldShowTrimWarning = isSignificantRangeTrim({
    originalRange,
    effectiveRange: range,
    ignoredTrailingColumns,
    ignoredTrailingRows,
  });

  return {
    range,
    rangeMetadata: {
      originalRef,
      effectiveRef: XLSX.utils.encode_range(range),
      wasTrimmed: ignoredTrailingColumns > 0 || ignoredTrailingRows > 0,
      shouldShowTrimWarning,
      ignoredTrailingColumns,
      ignoredTrailingRows,
    },
  };
}

function isSignificantRangeTrim({
  originalRange,
  effectiveRange,
  ignoredTrailingColumns,
  ignoredTrailingRows,
}: {
  originalRange: XLSX.Range;
  effectiveRange: XLSX.Range;
  ignoredTrailingColumns: number;
  ignoredTrailingRows: number;
}) {
  if (ignoredTrailingColumns >= 50 || ignoredTrailingRows >= 500) {
    return true;
  }

  const hasRelevantMinimum = ignoredTrailingColumns >= 10 || ignoredTrailingRows >= 100;
  if (!hasRelevantMinimum) {
    return false;
  }

  const originalArea = getRangeArea(originalRange);
  const effectiveArea = getRangeArea(effectiveRange);
  return originalArea >= effectiveArea * 5;
}

function getRangeArea(range: XLSX.Range) {
  return (range.e.c - range.s.c + 1) * (range.e.r - range.s.r + 1);
}

function isCellAddress(address: string) {
  return /^[A-Z]+\d+$/i.test(address);
}

function isUsefulCell(cell: XLSX.CellObject | undefined) {
  if (!cell) {
    return false;
  }

  if (typeof cell.f === 'string' && cell.f.trim() !== '') {
    return true;
  }

  if (typeof cell.v === 'string') {
    return cell.v.trim() !== '';
  }

  return cell.v !== undefined && cell.v !== null;
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
