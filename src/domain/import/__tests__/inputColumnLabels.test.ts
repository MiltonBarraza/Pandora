import { describe, expect, it } from 'vitest';
import type { InputColumn, VirtualInputColumn } from '../../../types/import';
import {
  getAvailableInputColumnLabel,
  getInputColumnLabel,
  isVirtualInputColumn,
  isVirtualInputColumnId,
  toRealInputColumns,
} from '../inputColumnLabels';

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

describe('available input column helpers', () => {
  it('detects virtual input column ids by reserved prefix', () => {
    expect(isVirtualInputColumnId('virtual:dato-adicional')).toBe(true);
    expect(isVirtualInputColumnId('input-0')).toBe(false);
    expect(isVirtualInputColumnId('')).toBe(false);
  });

  it('converts real Excel columns to discriminated real input columns', () => {
    expect(toRealInputColumns([baseColumn])).toEqual([
      {
        ...baseColumn,
        kind: 'real',
      },
    ]);
  });

  it('gets labels for real and virtual input columns', () => {
    const [realColumn] = toRealInputColumns([{ ...baseColumn, alias: 'Codigo' }]);
    const virtualColumn: VirtualInputColumn = {
      id: 'virtual:dato-adicional',
      kind: 'virtual',
      label: 'Dato adicional',
      active: true,
    };

    expect(getAvailableInputColumnLabel(realColumn)).toBe('C - Codigo');
    expect(getAvailableInputColumnLabel(virtualColumn)).toBe('Dato adicional');
  });

  it('identifies virtual columns without requiring Excel coordinates', () => {
    const virtualColumn: VirtualInputColumn = {
      id: 'virtual:descripcion-producto',
      kind: 'virtual',
      label: 'Descripción del producto',
      active: true,
      source: {
        type: 'inputNormalizationRule',
        ruleId: 'range-value',
      },
    };

    expect(isVirtualInputColumn(virtualColumn)).toBe(true);
    expect('columnIndex' in virtualColumn).toBe(false);
    expect('columnLetter' in virtualColumn).toBe(false);
  });
});
