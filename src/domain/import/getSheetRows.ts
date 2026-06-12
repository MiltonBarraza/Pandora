import * as XLSX from 'xlsx';
import type { RawRow, SheetCellMeta, SheetMergeRange, SheetReadMetadata, SheetRowMeta } from '../../types/import';

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
      row[columnIndex] = cell ? formatSheetCell(cell) : '';
    }

    if (row.some((cell) => String(cell ?? '').trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export function getSheetReadMetadata(workbook: XLSX.WorkBook, sheetName: string): SheetReadMetadata {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet['!ref']) {
    return { rows: [], merges: [] };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const merges = getSheetMergeRanges(sheet);
  const mergeByAddress = buildMergeAddressMap(merges);
  const rows: SheetRowMeta[] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const cells: SheetCellMeta[] = [];

    for (let columnIndex = 0; columnIndex <= range.e.c; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = sheet[address];
      const formattedValue = cell ? formatSheetCell(cell) : '';
      const mergeRange = mergeByAddress.get(address);

      cells.push({
        address,
        rowIndex,
        columnIndex,
        value: formattedValue,
        formattedValue,
        rawValue: cell?.v,
        cellType: cell?.t,
        numberFormat: getCellFormat(cell?.z),
        isMerged: Boolean(mergeRange),
        mergeRange,
        mergeOriginAddress: mergeRange?.originAddress,
        mergeOriginValue: mergeRange?.originValue,
      });
    }

    rows.push({
      originalRowIndex: rowIndex,
      cells,
      isEmpty: cells.every((cell) => cell.formattedValue.trim() === ''),
    });
  }

  return { rows, merges };
}

export function getSheetPreview(rows: RawRow[], limit = 12): RawRow[] {
  return rows.slice(0, limit);
}

function getSheetMergeRanges(sheet: XLSX.WorkSheet): SheetMergeRange[] {
  return (sheet['!merges'] ?? []).map((merge) => {
    const originAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const originCell = sheet[originAddress];

    return {
      startRow: merge.s.r,
      startColumn: merge.s.c,
      endRow: merge.e.r,
      endColumn: merge.e.c,
      originAddress,
      originValue: originCell ? formatSheetCell(originCell) : '',
    };
  });
}

function buildMergeAddressMap(merges: SheetMergeRange[]) {
  const mergeByAddress = new Map<string, SheetMergeRange>();

  // Kept for future non-tabular normalization rules. This does not fill values
  // or change the current flat row model.
  merges.forEach((merge) => {
    for (let rowIndex = merge.startRow; rowIndex <= merge.endRow; rowIndex += 1) {
      for (let columnIndex = merge.startColumn; columnIndex <= merge.endColumn; columnIndex += 1) {
        mergeByAddress.set(XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex }), merge);
      }
    }
  });

  return mergeByAddress;
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
