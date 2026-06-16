import { describe, expect, it } from 'vitest';
import { cellHasData, getColumnIndexesWithData } from '../columnData';

describe('cellHasData', () => {
  it('treats null, undefined and blank strings as empty', () => {
    expect(cellHasData(null)).toBe(false);
    expect(cellHasData(undefined)).toBe(false);
    expect(cellHasData('')).toBe(false);
    expect(cellHasData('   ')).toBe(false);
  });

  it('treats trimmed strings, numbers, dates and booleans as data', () => {
    expect(cellHasData(' dato ')).toBe(true);
    expect(cellHasData(0)).toBe(true);
    expect(cellHasData(false)).toBe(true);
    expect(cellHasData(new Date('2026-06-12'))).toBe(true);
  });
});

describe('getColumnIndexesWithData', () => {
  it('returns columns with at least one non-empty value in the evaluated range', () => {
    expect(getColumnIndexesWithData([
      [null, '  ', 0, undefined, false],
      ['', 'Cliente', undefined, new Date('2026-06-12'), null],
    ], 6)).toEqual([1, 2, 3, 4]);
  });
});
