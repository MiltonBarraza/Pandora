// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombineOutputColumn, CombinedRow } from '../../../types/combine';
import {
  buildCombinedCsv,
  escapeCombinedCsvCell,
  exportCombinedCsv,
  normalizeCombinedCsvFileName,
} from '../exportCombinedCsv';

afterEach(() => vi.restoreAllMocks());

const outputColumns: CombineOutputColumn[] = [
  { id: 'name', name: 'Nombre' },
  { id: 'notes', name: 'Notas' },
  { id: 'empty', name: 'Vacío' },
  { id: 'metadata:fileName', name: 'Archivo origen' },
];
const rows: CombinedRow[] = [
  row('2', { name: 'Segundo', notes: 'Línea 1\nLínea 2', empty: '', 'metadata:fileName': 'b.csv' }),
  row('1', { name: 'Primero, "especial"', notes: 'Normal', empty: '', 'metadata:fileName': 'a.xlsx' }),
];

describe('buildCombinedCsv', () => {
  it('includes headers and respects visible column and final row order', () => {
    expect(buildCombinedCsv({ outputColumns, combinedRows: rows })).toBe([
      'Nombre,Notas,Vacío,Archivo origen',
      'Segundo,"Línea 1\nLínea 2",,b.csv',
      '"Primero, ""especial""",Normal,,a.xlsx',
    ].join('\r\n'));
  });

  it('excludes metadata when metadata columns are absent', () => {
    const csv = buildCombinedCsv({ outputColumns: outputColumns.slice(0, 3), combinedRows: rows });
    expect(csv).not.toContain('Archivo origen');
    expect(csv).not.toContain('b.csv');
  });
});

describe('escapeCombinedCsvCell', () => {
  it.each([
    ['simple', 'simple'],
    ['con,coma', '"con,coma"'],
    ['con "comillas"', '"con ""comillas"""'],
    ['dos\r\nlíneas', '"dos\r\nlíneas"'],
    ['', ''],
    [null, ''],
  ])('escapes %j', (value, expected) => {
    expect(escapeCombinedCsvCell(value)).toBe(expected);
  });
});

describe('normalizeCombinedCsvFileName', () => {
  it.each([
    ['Reporte.xlsx', 'Reporte'],
    ['Reporte.csv', 'Reporte'],
    ['Reporte.xlsx.csv', 'Reporte'],
    ['  Reporte / final  ', 'Reporte final'],
    ['', 'Archivo combinado'],
  ])('normalizes %j', (value, expected) => {
    expect(normalizeCombinedCsvFileName(value)).toBe(expected);
  });
});

describe('exportCombinedCsv', () => {
  it('downloads UTF-8 CSV with a single csv extension', () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:combined-csv');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    let downloadedName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      downloadedName = this.download;
    });

    exportCombinedCsv({ outputColumns, combinedRows: rows, fileName: 'Reporte.xlsx' });

    expect(downloadedName).toBe('Reporte.csv');
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe('text/csv;charset=utf-8');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:combined-csv');
  });
});

function row(id: string, values: Record<string, string>): CombinedRow {
  return { id, sourceId: `source:${id}`, sourceFileName: `${id}.xlsx`, values };
}
