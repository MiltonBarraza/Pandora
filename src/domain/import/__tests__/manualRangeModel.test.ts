import { describe, expect, it } from 'vitest';
import type { InputRow, ManualRangeValue } from '../../../types/import';
import { findOverlappingManualRange, generateManualRangesFromTexts, hasOverlappingManualRanges, manualRangesOverlap } from '../manualRangeModel';

function range(id: string, startRowNumber: number, endRowNumber: number): ManualRangeValue {
  return {
    id,
    startRowNumber,
    endRowNumber,
    valueRecipe: { source: { type: 'fixedText', value: '' }, steps: [] },
  };
}

describe('manualRangeModel overlaps', () => {
  it('detects inclusive overlaps', () => {
    expect(manualRangesOverlap(range('a', 2, 5), range('b', 5, 8))).toBe(true);
    expect(manualRangesOverlap(range('a', 10, 10), range('b', 10, 12))).toBe(true);
    expect(manualRangesOverlap(range('a', 3, 7), range('b', 1, 3))).toBe(true);
  });

  it('does not detect contiguous non-overlapping ranges', () => {
    expect(manualRangesOverlap(range('a', 2, 5), range('b', 6, 8))).toBe(false);
    expect(manualRangesOverlap(range('a', 3, 7), range('b', 1, 2))).toBe(false);
  });

  it('ignores the edited range while searching overlaps', () => {
    const ranges = [
      range('current', 2, 5),
      range('other', 6, 8),
    ];

    expect(findOverlappingManualRange(range('current', 4, 7), ranges, 'current')).toEqual(expect.objectContaining({ id: 'other' }));
    expect(findOverlappingManualRange(range('current', 2, 5), ranges, 'current')).toBeNull();
  });
});

describe('manualRangeModel text-start generation', () => {
  it('extends each detected text range until the row before the next detected text', () => {
    const ranges = generateManualRangesFromTexts(rowsWithTexts([3, 9, 12], 20), {
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 20,
      mode: 'untilNextText',
      idFactory: createIdFactory(),
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 8 },
      { startRowNumber: 9, endRowNumber: 11 },
      { startRowNumber: 12, endRowNumber: 20 },
    ]);
    expect(hasOverlappingManualRanges(ranges)).toBe(false);
  });

  it('creates valid ranges for consecutive detected texts', () => {
    const ranges = generateManualRangesFromTexts(rowsWithTexts([3, 4], 10), {
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 10,
      mode: 'untilNextText',
      idFactory: createIdFactory(),
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 3 },
      { startRowNumber: 4, endRowNumber: 10 },
    ]);
    expect(hasOverlappingManualRanges(ranges)).toBe(false);
  });

  it('extends a single detected text to the final available row', () => {
    const ranges = generateManualRangesFromTexts(rowsWithTexts([3], 10), {
      inputColumnId: 'input-code',
      startRowNumber: 1,
      endRowNumber: 10,
      mode: 'untilNextText',
      idFactory: createIdFactory(),
    });

    expect(ranges.map(({ startRowNumber, endRowNumber }) => ({ startRowNumber, endRowNumber }))).toEqual([
      { startRowNumber: 3, endRowNumber: 10 },
    ]);
  });
});

function rowsWithTexts(textRows: number[], finalRowNumber: number): InputRow[] {
  const textRowSet = new Set(textRows);
  return Array.from({ length: finalRowNumber }, (_, index) => {
    const rowNumber = index + 1;
    return {
      rowNumber,
      values: { 'input-code': textRowSet.has(rowNumber) ? `Dato ${rowNumber}` : '' },
    };
  });
}

function createIdFactory() {
  let nextId = 1;
  return () => `range-${nextId++}`;
}
