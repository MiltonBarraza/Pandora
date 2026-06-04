import { describe, expect, it } from 'vitest';
import type { InputColumn } from '../../../types/import';
import { getInputColumnLabel } from '../inputColumnLabels';

const baseColumn: InputColumn = {
  id: 'input-2',
  columnIndex: 2,
  columnLetter: 'C',
  label: 'C',
  active: true,
  sampleValues: [],
  nonEmptyCount: 0,
};

describe('getInputColumnLabel', () => {
  it('uses alias when present', () => {
    expect(getInputColumnLabel({ ...baseColumn, alias: 'Codigo', header: 'SKU' })).toBe('C - Codigo');
  });

  it('uses header when alias is empty and header is not the column letter', () => {
    expect(getInputColumnLabel({ ...baseColumn, alias: ' ', header: 'SKU' })).toBe('C - SKU');
  });

  it('uses only the letter without alias or header', () => {
    expect(getInputColumnLabel(baseColumn)).toBe('C');
  });

  it('does not duplicate the letter as header', () => {
    expect(getInputColumnLabel({ ...baseColumn, header: 'C' })).toBe('C');
  });
});
