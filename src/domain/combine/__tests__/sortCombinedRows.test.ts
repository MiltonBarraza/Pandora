import { describe, expect, it } from 'vitest';
import type { CombineOutputColumn, CombinedRow } from '../../../types/combine';
import { defaultCombineResultSort, normalizeCombineResultSort, sortCombinedRows } from '../sortCombinedRows';

const outputColumns: CombineOutputColumn[] = [
  { id: 'code', name: 'Código' },
  { id: 'product', name: 'Producto' },
  { id: 'price', name: 'Precio' },
];

describe('sortCombinedRows', () => {
  it('keeps original order without selected column', () => {
    const rows = [
      row('row-1', { code: 'B' }),
      row('row-2', { code: 'A' }),
    ];

    expect(sortCombinedRows(rows, defaultCombineResultSort, outputColumns)).toBe(rows);
  });

  it('sorts text ascending and descending', () => {
    const rows = [
      row('row-1', { product: 'Zeta' }),
      row('row-2', { product: 'Alfa' }),
      row('row-3', { product: 'Medio' }),
    ];

    expect(sortCombinedRows(rows, { sortColumnId: 'product', sortDirection: 'asc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-2',
      'row-3',
      'row-1',
    ]);
    expect(sortCombinedRows(rows, { sortColumnId: 'product', sortDirection: 'desc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-1',
      'row-3',
      'row-2',
    ]);
  });

  it('sorts numeric-looking values numerically', () => {
    const rows = [
      row('row-1', { price: '10' }),
      row('row-2', { price: '2' }),
      row('row-3', { price: '30' }),
    ];

    expect(sortCombinedRows(rows, { sortColumnId: 'price', sortDirection: 'asc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-2',
      'row-1',
      'row-3',
    ]);
    expect(sortCombinedRows(rows, { sortColumnId: 'price', sortDirection: 'desc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-3',
      'row-1',
      'row-2',
    ]);
  });

  it('keeps empty or missing values at the end in both directions', () => {
    const rows = [
      row('row-empty', { price: '' }),
      row('row-missing', {}),
      row('row-small', { price: '1' }),
      row('row-large', { price: '9' }),
    ];

    expect(sortCombinedRows(rows, { sortColumnId: 'price', sortDirection: 'asc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-small',
      'row-large',
      'row-empty',
      'row-missing',
    ]);
    expect(sortCombinedRows(rows, { sortColumnId: 'price', sortDirection: 'desc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-large',
      'row-small',
      'row-empty',
      'row-missing',
    ]);
  });

  it('keeps stable order when values are equivalent', () => {
    const rows = [
      row('row-1', { code: 'A' }),
      row('row-2', { code: 'A' }),
      row('row-3', { code: 'B' }),
    ];

    expect(sortCombinedRows(rows, { sortColumnId: 'code', sortDirection: 'asc' }, outputColumns).map(({ id }) => id)).toEqual([
      'row-1',
      'row-2',
      'row-3',
    ]);
  });

  it('does not mutate input rows', () => {
    const rows = [
      row('row-1', { code: 'B' }),
      row('row-2', { code: 'A' }),
    ];
    const before = structuredClone(rows);

    sortCombinedRows(rows, { sortColumnId: 'code', sortDirection: 'asc' }, outputColumns);

    expect(rows).toEqual(before);
  });
});

describe('normalizeCombineResultSort', () => {
  it('falls back to no sort when selected column does not exist', () => {
    expect(normalizeCombineResultSort(
      { sortColumnId: 'missing', sortDirection: 'desc' },
      outputColumns,
    )).toEqual(defaultCombineResultSort);
  });
});

function row(id: string, values: Record<string, string>): CombinedRow {
  return {
    id,
    sourceId: `source:${id}`,
    sourceFileName: `${id}.xlsx`,
    values,
  };
}
