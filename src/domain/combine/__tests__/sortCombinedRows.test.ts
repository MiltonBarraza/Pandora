import { describe, expect, it } from 'vitest';
import type { CombinedRow } from '../../../types/combine';
import { parseSafeNumber, sortCombinedRows } from '../sortCombinedRows';

const rows = [
  row('1', 'Beta', '$ 10,752.18'),
  row('2', '', ''),
  row('3', 'alpha', '$ 1,948.63'),
  row('4', 'Beta', '82'),
];

describe('sortCombinedRows', () => {
  it('returns original rows unchanged when sorting is disabled', () => {
    expect(sortCombinedRows(rows, { columnId: null, direction: 'asc' })).toBe(rows);
  });

  it('sorts text ascending and descending, stably, with empty values last', () => {
    expect(ids(sortCombinedRows(rows, { columnId: 'name', direction: 'asc' }))).toEqual(['3', '1', '4', '2']);
    expect(ids(sortCombinedRows(rows, { columnId: 'name', direction: 'desc' }))).toEqual(['1', '4', '3', '2']);
  });

  it('sorts safe numeric and currency values numerically in both directions', () => {
    expect(ids(sortCombinedRows(rows, { columnId: 'price', direction: 'asc' }))).toEqual(['4', '3', '1', '2']);
    expect(ids(sortCombinedRows(rows, { columnId: 'price', direction: 'desc' }))).toEqual(['1', '3', '4', '2']);
  });

  it('does not mutate original rows', () => {
    const before = structuredClone(rows);
    sortCombinedRows(rows, { columnId: 'name', direction: 'desc' });
    expect(rows).toEqual(before);
  });
});

describe('parseSafeNumber', () => {
  it.each([
    ['82', 82],
    ['8393.32', 8393.32],
    ['$ 1,948.63', 1948.63],
    ['$ 10,752.18', 10752.18],
  ])('parses %s', (value, expected) => {
    expect(parseSafeNumber(value)).toBe(expected);
  });

  it('rejects ambiguous or non-numeric text', () => {
    expect(parseSafeNumber('1,5')).toBeNull();
    expect(parseSafeNumber('A82')).toBeNull();
  });
});

function row(id: string, name: string, price: string): CombinedRow {
  return { id, sourceId: 'source', sourceFileName: 'source.xlsx', values: { name, price } };
}

function ids(values: CombinedRow[]) {
  return values.map(({ id }) => id);
}
