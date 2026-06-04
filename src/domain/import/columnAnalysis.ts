import type * as XLSX from 'xlsx';
import type { ColumnAnalysis, ColumnDetectionOptions, IgnoredReason, RawRow } from '../../types/import';

export const defaultColumnDetectionOptions: ColumnDetectionOptions = {
  hideHiddenColumns: true,
  hideNarrowColumns: true,
  hideEmptyColumns: true,
  hideLowDataColumns: false,
  narrowWpxThreshold: 8,
  narrowWchThreshold: 2,
  lowDataMinValues: 2,
};

export function analyzeSheetColumns(
  sheet: XLSX.WorkSheet | undefined,
  rows: RawRow[],
  options: ColumnDetectionOptions = defaultColumnDetectionOptions,
  headerRowIndex: number | null = null,
  startRowIndex = 0,
): ColumnAnalysis[] {
  const maxColumns = getMaxColumnCount(sheet, rows);
  const productRows = rows.slice(startRowIndex);

  return Array.from({ length: maxColumns }, (_, columnIndex) => {
    const columnMetadata = sheet?.['!cols']?.[columnIndex];
    const isHidden = isColumnHidden(columnMetadata);
    const width = getColumnWidth(columnMetadata);
    const isNarrow = isColumnNarrow(columnMetadata, options);
    const sampleValues = getColumnSampleValues(rows, columnIndex, startRowIndex);
    const nonEmptyCount = productRows.filter((row) => cellText(row[columnIndex]) !== '').length;
    const isEmpty = nonEmptyCount === 0;
    const header = headerRowIndex === null ? '' : cellText(rows[headerRowIndex]?.[columnIndex]);
    const autoIgnoredReason = getAutoIgnoredReason({
      isHidden,
      isNarrow,
      isEmpty,
      nonEmptyCount,
      options,
    });

    return {
      columnIndex,
      columnLetter: columnLetter(columnIndex),
      header,
      sampleValues,
      nonEmptyCount,
      isHidden,
      width,
      isNarrow,
      isEmpty,
      ignored: Boolean(autoIgnoredReason),
      ignoredReason: autoIgnoredReason,
      autoIgnored: Boolean(autoIgnoredReason),
      autoIgnoredReason,
    };
  });
}

export function isColumnHidden(columnMetadata: XLSX.ColInfo | undefined) {
  return columnMetadata?.hidden === true;
}

export function isColumnNarrow(columnMetadata: XLSX.ColInfo | undefined, options = defaultColumnDetectionOptions) {
  if (!columnMetadata) {
    return false;
  }

  const wpx = typeof columnMetadata.wpx === 'number' ? columnMetadata.wpx : undefined;
  const wch = typeof columnMetadata.wch === 'number' ? columnMetadata.wch : undefined;
  return (
    (typeof wpx === 'number' && wpx <= options.narrowWpxThreshold) ||
    (typeof wch === 'number' && wch <= options.narrowWchThreshold)
  );
}

export function getColumnSampleValues(rows: RawRow[], columnIndex: number, startRowIndex = 0, limit = 3) {
  const sample: string[] = [];

  rows.slice(startRowIndex).some((row) => {
    const value = cellText(row[columnIndex]);
    if (value) {
      sample.push(value);
    }
    return sample.length >= limit;
  });

  return sample;
}

export function applyColumnVisibility(rows: RawRow[], activeColumns: number[]): RawRow[] {
  return rows.map((row) => activeColumns.map((columnIndex) => row[columnIndex] ?? ''));
}

export function columnLetter(index: number) {
  let dividend = index + 1;
  let name = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return name;
}

function getMaxColumnCount(sheet: XLSX.WorkSheet | undefined, rows: RawRow[]) {
  const rowMax = Math.max(1, ...rows.map((row) => row.length));
  const ref = sheet?.['!ref'];
  if (!ref) {
    return rowMax;
  }

  const range = decodeRange(ref);
  return Math.max(rowMax, range.e.c + 1);
}

function decodeRange(ref: string) {
  const refParts = ref.split(':');
  const endRef = refParts[refParts.length - 1] ?? ref;
  const letters = endRef.match(/[A-Z]+/i)?.[0] ?? 'A';
  let column = 0;
  letters.toUpperCase().split('').forEach((letter) => {
    column = column * 26 + letter.charCodeAt(0) - 64;
  });
  return { e: { c: column - 1 } };
}

function getColumnWidth(columnMetadata: XLSX.ColInfo | undefined) {
  if (!columnMetadata) {
    return undefined;
  }

  return columnMetadata.wpx ?? columnMetadata.wch ?? columnMetadata.width;
}

function getAutoIgnoredReason({
  isHidden,
  isNarrow,
  isEmpty,
  nonEmptyCount,
  options,
}: {
  isHidden: boolean;
  isNarrow: boolean;
  isEmpty: boolean;
  nonEmptyCount: number;
  options: ColumnDetectionOptions;
}): IgnoredReason | undefined {
  if (options.hideHiddenColumns && isHidden) {
    return 'hidden';
  }

  if (options.hideNarrowColumns && isNarrow) {
    return 'narrow';
  }

  if (options.hideEmptyColumns && isEmpty) {
    return 'empty';
  }

  if (options.hideLowDataColumns && nonEmptyCount < options.lowDataMinValues) {
    return 'lowData';
  }

  return undefined;
}

function cellText(value: unknown) {
  return String(value ?? '').trim();
}
