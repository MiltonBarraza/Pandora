import type { RawRow } from '../../types/import';

export function getColumnIndexesWithData(rows: RawRow[], maxColumns: number) {
  return Array.from({ length: maxColumns }, (_, columnIndex) => columnIndex).filter((columnIndex) =>
    rows.some((row) => cellHasData(row[columnIndex])),
  );
}

export function cellHasData(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
}
