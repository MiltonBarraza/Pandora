import { describe, expect, it } from 'vitest';
import type { ManualRangeValue } from '../../../types/import';
import { findOverlappingManualRange, manualRangesOverlap } from '../manualRangeModel';

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
