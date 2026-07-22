import { describe, expect, it } from 'vitest';
import type { CombinedRow } from '../../../types/combine';
import {
  addSourceMetadataToRows,
  buildSourceMetadataColumns,
  sourceFileNameColumnId,
  sourceSheetNameColumnId,
} from '../sourceMetadata';

const rows: CombinedRow[] = [
  {
    id: 'row:1',
    sourceId: 'source:1',
    sourceFileName: 'ventas.xlsx',
    sourceSheetName: 'Julio',
    values: { code: 'A1' },
  },
  {
    id: 'row:2',
    sourceId: 'source:2',
    sourceFileName: 'stock.csv',
    values: { code: 'B2' },
  },
];

describe('source metadata', () => {
  it('adds no columns or values by default', () => {
    const options = { includeFileName: false, includeSheetName: false };
    expect(buildSourceMetadataColumns(options)).toEqual([]);
    expect(addSourceMetadataToRows(rows, options)).toBe(rows);
  });

  it('adds file metadata with a collision-safe internal id', () => {
    const options = { includeFileName: true, includeSheetName: false };
    expect(buildSourceMetadataColumns(options)).toEqual([
      { id: sourceFileNameColumnId, name: 'Archivo origen' },
    ]);
    expect(addSourceMetadataToRows(rows, options).map((row) => row.values[sourceFileNameColumnId])).toEqual([
      'ventas.xlsx',
      'stock.csv',
    ]);
  });

  it('adds selected sheet metadata and uses empty fallback when absent', () => {
    const options = { includeFileName: false, includeSheetName: true };
    expect(buildSourceMetadataColumns(options)).toEqual([
      { id: sourceSheetNameColumnId, name: 'Hoja origen' },
    ]);
    expect(addSourceMetadataToRows(rows, options).map((row) => row.values[sourceSheetNameColumnId])).toEqual([
      'Julio',
      '',
    ]);
  });

  it('adds both columns at end without mutating rows', () => {
    const before = structuredClone(rows);
    const result = addSourceMetadataToRows(rows, { includeFileName: true, includeSheetName: true });

    expect(buildSourceMetadataColumns({ includeFileName: true, includeSheetName: true }).map(({ name }) => name)).toEqual([
      'Archivo origen',
      'Hoja origen',
    ]);
    expect(result).not.toBe(rows);
    expect(rows).toEqual(before);
  });
});
