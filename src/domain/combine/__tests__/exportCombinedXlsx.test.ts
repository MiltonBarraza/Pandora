import { describe, expect, it } from 'vitest';
import type { CombineOutputColumn, CombinedRow } from '../../../types/combine';
import { buildCombinedExportAoA } from '../exportCombinedXlsx';

const outputColumns: CombineOutputColumn[] = [
  { id: 'product', name: 'Producto' },
  { id: 'price', name: 'Precio' },
];

const rows: CombinedRow[] = [
  combinedRow('row-1', 'enero.xlsx', { product: 'Pincel', price: '1200' }),
  combinedRow('row-2', 'febrero.csv', { product: 'Rodillo', price: '3400' }),
];

describe('buildCombinedExportAoA', () => {
  it('creates headers in output column order', () => {
    expect(buildCombinedExportAoA({ outputColumns, combinedRows: [] })[0]).toEqual([
      'Producto',
      'Precio',
    ]);
  });

  it('exports rows in their existing order', () => {
    expect(buildCombinedExportAoA({ outputColumns, combinedRows: rows }).slice(1)).toEqual([
      ['Pincel', '1200'],
      ['Rodillo', '3400'],
    ]);
  });

  it('uses an empty string for missing cells', () => {
    const incompleteRow = combinedRow('row-1', 'enero.xlsx', { product: 'Pincel' });

    expect(buildCombinedExportAoA({ outputColumns, combinedRows: [incompleteRow] })[1]).toEqual([
      'Pincel',
      '',
    ]);
  });

  it('uses a fallback for empty output column names', () => {
    const columns = [{ id: 'empty', name: '   ' }];

    expect(buildCombinedExportAoA({ outputColumns: columns, combinedRows: [] })[0]).toEqual([
      'Columna sin nombre',
    ]);
  });

  it('does not include source metadata by default', () => {
    const aoa = buildCombinedExportAoA({ outputColumns, combinedRows: rows });
    const serialized = JSON.stringify(aoa);

    expect(serialized).not.toContain('enero.xlsx');
    expect(serialized).not.toContain('febrero.csv');
    expect(serialized).not.toContain('source:row-1');
  });

  it('preserves duplicate header names', () => {
    const columns = [
      { id: 'price-1', name: 'Precio' },
      { id: 'price-2', name: 'Precio' },
    ];

    expect(buildCombinedExportAoA({ outputColumns: columns, combinedRows: [] })[0]).toEqual([
      'Precio',
      'Precio',
    ]);
  });
});

function combinedRow(id: string, sourceFileName: string, values: Record<string, string>): CombinedRow {
  return {
    id,
    sourceId: `source:${id}`,
    sourceFileName,
    sourceSheetName: 'Hoja 1',
    values,
  };
}
